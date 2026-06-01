const crypto = require('crypto');

const HyNode = require('../models/hyNodeModel');

const ANTI_DPI_TAG_PREFIX = 'anti-dpi-xhttp';

const REALITY_TARGETS = [
    { host: 'www.microsoft.com', port: 443, fingerprint: 'chrome' },
    { host: 'www.apple.com', port: 443, fingerprint: 'chrome' },
    { host: 'www.amazon.com', port: 443, fingerprint: 'chrome' },
    { host: 'www.cloudflare.com', port: 443, fingerprint: 'chrome' },
];

const XHTTP_PORTS = [9443, 2053, 2083, 2087, 2096, 24443, 34443, 44443, 54443];

function toPlain(value) {
    if (!value) return {};
    return typeof value.toObject === 'function'
        ? value.toObject({ depopulate: false })
        : { ...value };
}

function pickTarget(node, offset = 0) {
    const seed = String(node?._id || node?.ip || node?.name || '');
    let sum = 0;
    for (const ch of seed) sum += ch.charCodeAt(0);
    return REALITY_TARGETS[(sum + offset) % REALITY_TARGETS.length];
}

function targetToDest(target) {
    return `${target.host}:${target.port || 443}`;
}

function collectReservedPorts(node, siblingNodes = []) {
    const ports = new Set();
    const add = value => {
        const n = Number(value);
        if (Number.isInteger(n) && n > 0) ports.add(n);
    };

    const collect = item => {
        if (!item) return;
        add(item.port);
        add(item.statsPort);
        add(item.xray?.apiPort);
        add(item.xray?.agentPort);
        for (const extra of item.xray?.extraInbounds || []) add(extra?.port);
    };

    collect(node);
    siblingNodes.forEach(collect);
    return ports;
}

function pickXhttpPort(node, siblingNodes, preferredPorts = XHTTP_PORTS) {
    const reserved = collectReservedPorts(node, siblingNodes);
    for (const port of preferredPorts) {
        if (!reserved.has(port)) return port;
    }
    for (let port = 30000; port < 65000; port += 137) {
        if (!reserved.has(port)) return port;
    }
    throw new Error('No free port available for anti-DPI XHTTP inbound');
}

function randomPath() {
    return `/cdn-cgi/trace/${crypto.randomBytes(5).toString('hex')}`;
}

function normalizeExtraInbound(extra) {
    return typeof extra?.toObject === 'function'
        ? extra.toObject()
        : { ...(extra || {}) };
}

function summarizeNode(node) {
    const raw = toPlain(node);
    const xray = raw.xray || {};
    return {
        _id: raw._id,
        type: raw.type,
        name: raw.name,
        ip: raw.ip,
        domain: raw.domain,
        port: raw.port,
        groups: raw.groups,
        active: raw.active,
        status: raw.status,
        lastSync: raw.lastSync,
        lastError: raw.lastError,
        xray: {
            transport: xray.transport,
            security: xray.security,
            flow: xray.flow,
            fingerprint: xray.fingerprint,
            realityDest: xray.realityDest,
            realitySni: xray.realitySni,
            realityPublicKey: xray.realityPublicKey,
            realityShortIds: xray.realityShortIds,
            realitySpiderX: xray.realitySpiderX,
            extraInbounds: (xray.extraInbounds || []).map(extra => ({
                id: extra.id,
                label: extra.label,
                port: extra.port,
                inboundTag: extra.inboundTag,
                transport: extra.transport,
                security: extra.security,
                fingerprint: extra.fingerprint,
                realityDest: extra.realityDest,
                realitySni: extra.realitySni,
                realityPublicKey: extra.realityPublicKey,
                realityShortIds: extra.realityShortIds,
                xhttpPath: extra.xhttpPath,
                xhttpMode: extra.xhttpMode,
            })),
        },
    };
}

async function buildAntiDpiUpdates(node, options = {}) {
    if (!node || node.type !== 'xray') {
        throw new Error('Anti-DPI profile can be applied only to Xray nodes');
    }

    const {
        rotateRealityTarget = true,
        includeXhttp = true,
        preferredPorts = XHTTP_PORTS,
    } = options;

    const siblingNodes = node.ip
        ? await HyNode.find({ ip: node.ip, _id: { $ne: node._id } }).lean()
        : [];

    const xray = toPlain(node.xray);
    if (!xray.realityPrivateKey || !xray.realityPublicKey) {
        throw new Error(`Node ${node.name} has no REALITY key pair`);
    }

    const mainTarget = pickTarget(node, 0);
    const backupTarget = pickTarget(node, 1);
    const updatedXray = {
        ...xray,
        fingerprint: 'chrome',
        realitySpiderX: '',
        extraInbounds: (xray.extraInbounds || []).map(normalizeExtraInbound),
    };

    if (rotateRealityTarget) {
        updatedXray.realityDest = targetToDest(mainTarget);
        updatedXray.realitySni = [mainTarget.host];
    }

    if (includeXhttp) {
        const existingIndex = updatedXray.extraInbounds.findIndex(extra =>
            String(extra?.inboundTag || '').startsWith(ANTI_DPI_TAG_PREFIX) ||
            String(extra?.label || '').trim().toLowerCase() === 'xhttp reality'
        );
        const existing = existingIndex >= 0 ? updatedXray.extraInbounds[existingIndex] : null;
        const existingPort = Number(existing?.port);
        const port = Number.isInteger(existingPort) && existingPort > 0
            ? existingPort
            : pickXhttpPort(node, siblingNodes, preferredPorts);
        const inbound = {
            ...(existing || {}),
            id: existing?.id || crypto.randomUUID(),
            label: 'XHTTP Reality',
            uniqueName: false,
            port,
            inboundTag: `${ANTI_DPI_TAG_PREFIX}-${port}`,
            transport: 'xhttp',
            security: 'reality',
            flow: '',
            fingerprint: 'chrome',
            alpn: [],
            realityDest: targetToDest(backupTarget),
            realitySni: [backupTarget.host],
            realityPrivateKey: xray.realityPrivateKey,
            realityPublicKey: xray.realityPublicKey,
            realityShortIds: Array.isArray(xray.realityShortIds) && xray.realityShortIds.length
                ? xray.realityShortIds
                : [''],
            realitySpiderX: '',
            wsPath: '/',
            wsHost: '',
            grpcServiceName: 'grpc',
            xhttpPath: existing?.xhttpPath || randomPath(),
            xhttpHost: '',
            xhttpMode: 'stream-one',
            fallbackDest: '',
        };

        if (existingIndex >= 0) {
            updatedXray.extraInbounds[existingIndex] = inbound;
        } else {
            updatedXray.extraInbounds.push(inbound);
        }
    }

    return {
        xray: updatedXray,
        profile: {
            name: 'russia-strict',
            mainRealityTarget: updatedXray.realityDest,
            xhttpInbounds: updatedXray.extraInbounds
                .filter(extra => String(extra?.inboundTag || '').startsWith(ANTI_DPI_TAG_PREFIX))
                .map(extra => ({
                    port: extra.port,
                    target: extra.realityDest,
                    sni: extra.realitySni?.[0] || '',
                    path: extra.xhttpPath,
                    mode: extra.xhttpMode,
                })),
        },
    };
}

async function applyAntiDpiProfile(nodeId, options = {}) {
    const node = await HyNode.findById(nodeId);
    if (!node) return { error: `Node '${nodeId}' not found`, code: 404 };
    const updates = await buildAntiDpiUpdates(node, options);
    const updatedNode = await HyNode.findByIdAndUpdate(
        nodeId,
        { $set: { xray: updates.xray } },
        { new: true }
    ).populate('groups', 'name color');
    return { success: true, node: summarizeNode(updatedNode), profile: updates.profile };
}

module.exports = {
    ANTI_DPI_TAG_PREFIX,
    REALITY_TARGETS,
    XHTTP_PORTS,
    applyAntiDpiProfile,
    buildAntiDpiUpdates,
};
