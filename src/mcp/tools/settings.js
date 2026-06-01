/**
 * MCP Tools - Panel settings and routing management
 * Tools: query_settings, manage_routing
 */

const { z } = require('zod');
const Settings = require('../../models/settingsModel');
const cache = require('../../services/cacheService');
const logger = require('../../utils/logger');
const { invalidateSettingsCache } = require('../../utils/helpers');

const RULE_TYPES = ['domain_suffix', 'domain_keyword', 'domain', 'geosite', 'geoip', 'ip_cidr'];
const RULE_ACTIONS = ['direct', 'block'];

const ROUTING_PRESETS = {
    'bypass-ru': [
        { action: 'direct', type: 'geosite', value: 'russia-outside', comment: 'ITDog Russia outside', enabled: true },
        { action: 'direct', type: 'geosite', value: 'category-ru', comment: 'SagerNet Russian sites', enabled: true },
        { action: 'direct', type: 'geoip', value: 'ru', comment: 'Russian IPs', enabled: true },
        { action: 'direct', type: 'domain_suffix', value: '.ru', comment: 'Fallback TLD', enabled: true },
        { action: 'direct', type: 'domain_suffix', value: '.su', comment: 'Fallback TLD', enabled: true },
        { action: 'direct', type: 'domain_suffix', value: '.xn--p1ai', comment: '.рф fallback', enabled: true },
        { action: 'direct', type: 'geoip', value: 'private', comment: 'LAN', enabled: true },
    ],
    'bypass-lan': [
        { action: 'direct', type: 'geoip', value: 'private', comment: 'LAN', enabled: true },
    ],
    'block-ads': [
        { action: 'block', type: 'geosite', value: 'category-ads', comment: 'Ad networks', enabled: true },
    ],
};

const routingRuleSchema = z.object({
    action: z.enum(RULE_ACTIONS).default('direct'),
    type: z.enum(RULE_TYPES),
    value: z.string().trim().min(1).max(300),
    comment: z.string().trim().max(100).optional().default(''),
    enabled: z.boolean().optional().default(true),
});

const querySettingsSchema = z.object({
    section: z.enum(['routing', 'loadBalancing', 'subscription', 'all']).default('routing'),
});

const manageRoutingSchema = z.object({
    action: z.enum(['enable', 'disable', 'apply_preset', 'add_rule', 'remove_rule', 'replace_rules', 'set_dns']),
    preset: z.enum(Object.keys(ROUTING_PRESETS)).optional(),
    rule: routingRuleSchema.optional(),
    rules: z.array(routingRuleSchema).max(200).optional(),
    match: z.object({
        action: z.enum(RULE_ACTIONS).optional(),
        type: z.enum(RULE_TYPES).optional(),
        value: z.string().trim().min(1).optional(),
    }).optional(),
    dns: z.object({
        domestic: z.string().trim().min(1).max(200).optional(),
        remote: z.string().trim().min(1).max(200).optional(),
    }).optional(),
    merge: z.boolean().optional().default(true).describe('For apply_preset: merge with existing rules instead of replacing them'),
});

function serializeSettings(settings, section) {
    const raw = settings.toObject ? settings.toObject() : settings;
    const safe = {
        routing: raw.routing || {},
        loadBalancing: raw.loadBalancing || {},
        subscription: {
            supportUrl: raw.subscription?.supportUrl || '',
            webPageUrl: raw.subscription?.webPageUrl || '',
            happProviderId: raw.subscription?.happProviderId || '',
            logoUrl: raw.subscription?.logoUrl || '',
            pageTitle: raw.subscription?.pageTitle || '',
            updateInterval: raw.subscription?.updateInterval || 12,
            happ: raw.subscription?.happ || {},
        },
    };

    if (section === 'all') return safe;
    return { [section]: safe[section] };
}

function normalizeRule(rule) {
    return {
        action: rule.action === 'block' ? 'block' : 'direct',
        type: rule.type,
        value: String(rule.value || '').trim(),
        comment: String(rule.comment || '').trim().slice(0, 100),
        enabled: rule.enabled !== false,
    };
}

function ruleKey(rule) {
    return `${rule.action}:${rule.type}:${String(rule.value).trim().toLowerCase()}`;
}

function dedupeRules(rules) {
    const seen = new Set();
    const result = [];
    for (const raw of rules || []) {
        const rule = normalizeRule(raw);
        if (!rule.value || !RULE_TYPES.includes(rule.type)) continue;
        const key = ruleKey(rule);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(rule);
        if (result.length >= 200) break;
    }
    return result;
}

function removeMatchingRules(rules, match) {
    if (!match?.value && !match?.type && !match?.action) {
        throw new Error('match.action, match.type, or match.value is required for remove_rule');
    }

    const wantedValue = match.value ? String(match.value).trim().toLowerCase() : null;
    return (rules || []).filter(rule => {
        if (match.action && rule.action !== match.action) return true;
        if (match.type && rule.type !== match.type) return true;
        if (wantedValue && String(rule.value || '').trim().toLowerCase() !== wantedValue) return true;
        return false;
    });
}

async function persistRouting(updates) {
    const settings = await Settings.update(updates);
    await invalidateSettingsCache();
    await cache.invalidateAllSubscriptions();
    return settings;
}

async function querySettings(args) {
    const parsed = querySettingsSchema.parse(args || {});
    const settings = await Settings.get();
    return serializeSettings(settings, parsed.section);
}

async function manageRouting(args, emit = () => {}) {
    const parsed = manageRoutingSchema.parse(args || {});
    const settings = await Settings.get();
    const current = settings.routing || {};
    const currentRules = dedupeRules(current.rules || []);
    const updates = {};

    switch (parsed.action) {
        case 'enable':
            updates['routing.enabled'] = true;
            break;

        case 'disable':
            updates['routing.enabled'] = false;
            break;

        case 'apply_preset': {
            if (!parsed.preset) throw new Error('preset is required for apply_preset');
            const presetRules = ROUTING_PRESETS[parsed.preset];
            const nextRules = parsed.merge
                ? dedupeRules([...currentRules, ...presetRules])
                : dedupeRules(presetRules);
            updates['routing.enabled'] = true;
            updates['routing.rules'] = nextRules;
            break;
        }

        case 'add_rule': {
            if (!parsed.rule) throw new Error('rule is required for add_rule');
            updates['routing.rules'] = dedupeRules([...currentRules, parsed.rule]);
            updates['routing.enabled'] = true;
            break;
        }

        case 'remove_rule':
            updates['routing.rules'] = removeMatchingRules(currentRules, parsed.match);
            break;

        case 'replace_rules': {
            if (!parsed.rules) throw new Error('rules is required for replace_rules');
            updates['routing.rules'] = dedupeRules(parsed.rules);
            updates['routing.enabled'] = true;
            break;
        }

        case 'set_dns':
            if (!parsed.dns?.domestic && !parsed.dns?.remote) {
                throw new Error('dns.domestic or dns.remote is required for set_dns');
            }
            if (parsed.dns.domestic) updates['routing.dns.domestic'] = parsed.dns.domestic;
            if (parsed.dns.remote) updates['routing.dns.remote'] = parsed.dns.remote;
            break;

        default:
            throw new Error(`Unknown action: ${parsed.action}`);
    }

    emit('progress', { message: 'Saving routing settings and invalidating subscription cache...' });
    const updated = await persistRouting(updates);
    logger.info(`[MCP] Routing settings updated action=${parsed.action}`);

    return {
        success: true,
        action: parsed.action,
        routing: serializeSettings(updated, 'routing').routing,
    };
}

module.exports = {
    querySettings,
    manageRouting,
    schemas: {
        querySettings: querySettingsSchema,
        manageRouting: manageRoutingSchema,
    },
    ROUTING_PRESETS,
};
