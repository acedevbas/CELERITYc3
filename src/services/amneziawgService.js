/**
 * AmneziaWG 2.0 helpers: key material, peer addressing and config rendering.
 */

const crypto = require('crypto');
const HyUser = require('../models/hyUserModel');

const DEFAULTS = {
    interfaceName: 'awg0',
    serverAddress: '10.66.0.1/16',
    clientCidr: '10.66.0.0/16',
    dns: ['1.1.1.1', '8.8.8.8'],
    mtu: 1420,
    persistentKeepalive: 25,
    allowedIPs: ['0.0.0.0/0'],
    jc: 4,
    jmin: 10,
    jmax: 50,
    s1: 0,
    s2: 0,
    s3: 0,
    s4: 0,
    h1: '',
    h2: '',
    h3: '',
    h4: '',
    i1: '<r 2><b 0x858000010001000000000669636c6f756403636f6d0000010001c00c000100010000105a00044d583737>',
    i2: '',
    i3: '',
    i4: '',
    i5: '',
};

function base64Key(buf) {
    return Buffer.from(buf).toString('base64');
}

function randomKey() {
    return base64Key(crypto.randomBytes(32));
}

function toPlainConfig(config = {}) {
    if (config && typeof config.toObject === 'function') {
        return config.toObject({ getters: false, virtuals: false, depopulate: true });
    }
    return { ...(config || {}) };
}

function randomInt(minInclusive, maxExclusive) {
    return crypto.randomInt(minInclusive, maxExclusive);
}

function generateAwg2Parameters() {
    const params = {
        jc: randomInt(4, 7),
        jmin: 10,
        jmax: 50,
    };

    const initiationSize = 148;
    const responseSize = 92;
    const cookieReplySize = 64;
    const used = new Set();

    let s1 = randomInt(15, 150);
    used.add(s1);

    let s2 = randomInt(15, 150);
    while (used.has(s2) || s1 + initiationSize === s2 + responseSize) {
        s2 = randomInt(15, 150);
    }
    used.add(s2);

    let s3 = randomInt(0, 64);
    while (
        used.has(s3)
        || s1 + initiationSize === s3 + cookieReplySize
        || s2 + responseSize === s3 + cookieReplySize
    ) {
        s3 = randomInt(0, 64);
    }
    used.add(s3);

    let s4 = randomInt(0, 20);
    while (used.has(s4)) {
        s4 = randomInt(0, 20);
    }

    Object.assign(params, { s1, s2, s3, s4 });

    let min = 5;
    const max = 2147483647;
    for (const key of ['h1', 'h2', 'h3', 'h4']) {
        const first = randomInt(min, max);
        const second = randomInt(first, max);
        params[key] = `${first}-${second}`;
        min = second;
    }

    return params;
}

function usesLegacyAwgPlaceholders(cfg) {
    const h = ['h1', 'h2', 'h3', 'h4'].map(key => String(cfg[key] || '').trim());
    const s = ['s1', 's2', 's3', 's4'].map(key => parseInt(cfg[key], 10) || 0);
    return h.join('|') === '1|2|3|4' && s.every(value => value === 0);
}

function ensureAwg2Parameters(config = {}, options = {}) {
    const cfg = toPlainConfig(config);
    const replaceLegacyPlaceholders = options.replaceLegacyPlaceholders === true && usesLegacyAwgPlaceholders(cfg);
    const shouldFill = replaceLegacyPlaceholders
        || ['h1', 'h2', 'h3', 'h4'].some(key => !String(cfg[key] || '').trim());

    if (!shouldFill) return cfg;

    const params = generateAwg2Parameters();
    for (const [key, value] of Object.entries(params)) {
        if (replaceLegacyPlaceholders || cfg[key] === undefined || cfg[key] === '' || cfg[key] === 0) {
            cfg[key] = value;
        }
    }
    return cfg;
}

function buildConfigUpdate(config = {}, prefix = 'amneziawg') {
    const update = {};
    for (const [key, value] of Object.entries(toPlainConfig(config))) {
        if (value !== undefined) update[`${prefix}.${key}`] = value;
    }
    return update;
}

function generateWireGuardKeyPair() {
    const rawPrivate = crypto.randomBytes(32);
    rawPrivate[0] &= 248;
    rawPrivate[31] &= 127;
    rawPrivate[31] |= 64;

    const pkcs8Prefix = Buffer.from('302e020100300506032b656e04220420', 'hex');
    const privateKey = crypto.createPrivateKey({
        key: Buffer.concat([pkcs8Prefix, rawPrivate]),
        format: 'der',
        type: 'pkcs8',
    });
    const publicDer = crypto.createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
    const rawPublic = publicDer.subarray(publicDer.length - 32);

    return {
        privateKey: base64Key(rawPrivate),
        publicKey: base64Key(rawPublic),
    };
}

function privateKeyToPublic(privateKeyBase64) {
    const rawPrivate = Buffer.from(String(privateKeyBase64 || ''), 'base64');
    if (rawPrivate.length !== 32) return '';
    const pkcs8Prefix = Buffer.from('302e020100300506032b656e04220420', 'hex');
    const privateKey = crypto.createPrivateKey({
        key: Buffer.concat([pkcs8Prefix, rawPrivate]),
        format: 'der',
        type: 'pkcs8',
    });
    const publicDer = crypto.createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
    return base64Key(publicDer.subarray(publicDer.length - 32));
}

function isBase64Key(value) {
    try {
        return Buffer.from(String(value || ''), 'base64').length === 32;
    } catch (_) {
        return false;
    }
}

function ipToInt(ip) {
    const parts = String(ip || '').split('.').map(n => parseInt(n, 10));
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function intToIp(num) {
    return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255,
    ].join('.');
}

function parseCidr(cidr) {
    const [ip, prefixRaw] = String(cidr || DEFAULTS.clientCidr).split('/');
    const prefix = Math.min(30, Math.max(8, parseInt(prefixRaw, 10) || 16));
    const base = ipToInt(ip) ?? ipToInt('10.66.0.0');
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    const network = base & mask;
    const size = 2 ** (32 - prefix);
    return { network, prefix, size };
}

function normalizeIpv4Cidr(cidr, fallback = DEFAULTS.clientCidr) {
    const parsed = parseCidr(cidr || fallback);
    return `${intToIp(parsed.network)}/${parsed.prefix}`;
}

function peerAddressFromUserId(userId, cidr, reserved) {
    const { network, size } = parseCidr(cidr);
    const capacity = Math.max(1, size - 3);
    const seed = crypto.createHash('sha256').update(String(userId || crypto.randomUUID())).digest().readUInt32BE(0);
    let offset = 2 + (seed % capacity);

    for (let i = 0; i < capacity; i++) {
        const candidate = `${intToIp((network + offset) >>> 0)}/32`;
        if (!reserved.has(candidate)) {
            reserved.add(candidate);
            return candidate;
        }
        offset = 2 + ((offset - 1) % capacity);
    }
    throw new Error(`No free AmneziaWG peer addresses in ${cidr}`);
}

function normalizeStringList(value, fallback = []) {
    const raw = Array.isArray(value) ? value : String(value || '').split(',');
    const list = raw.map(v => String(v || '').trim()).filter(Boolean);
    return list.length > 0 ? list : fallback;
}

function normalizeInterfaceName(value) {
    const safe = String(value || DEFAULTS.interfaceName)
        .replace(/[^A-Za-z0-9_=+.-]/g, '')
        .slice(0, 15);
    return safe || DEFAULTS.interfaceName;
}

function normalizeConfig(config = {}) {
    const cfg = { ...DEFAULTS, ...toPlainConfig(config) };
    cfg.interfaceName = normalizeInterfaceName(cfg.interfaceName);
    cfg.serverAddress = String(cfg.serverAddress || DEFAULTS.serverAddress).trim();
    cfg.clientCidr = String(cfg.clientCidr || DEFAULTS.clientCidr).trim();
    cfg.dns = normalizeStringList(cfg.dns, DEFAULTS.dns);
    cfg.allowedIPs = normalizeStringList(cfg.allowedIPs, DEFAULTS.allowedIPs);
    cfg.mtu = Math.min(9000, Math.max(576, parseInt(cfg.mtu, 10) || DEFAULTS.mtu));
    const keepalive = parseInt(cfg.persistentKeepalive, 10);
    cfg.persistentKeepalive = Number.isInteger(keepalive)
        ? Math.min(65535, Math.max(0, keepalive))
        : DEFAULTS.persistentKeepalive;
    ['jc', 'jmin', 'jmax', 's1', 's2', 's3', 's4'].forEach(key => {
        cfg[key] = Math.min(65535, Math.max(0, parseInt(cfg[key], 10) || 0));
    });
    ['h1', 'h2', 'h3', 'h4', 'i1', 'i2', 'i3', 'i4', 'i5'].forEach(key => {
        cfg[key] = String(cfg[key] || '').trim();
    });
    if (!cfg.i1) cfg.i1 = DEFAULTS.i1;
    return cfg;
}

async function ensureUsersPeerMaterial(users, options = {}) {
    const list = Array.isArray(users) ? users : [];
    if (list.length === 0) return list;

    const cidr = options.clientCidr || DEFAULTS.clientCidr;
    const existing = await HyUser.find({ 'amneziawg.address': { $ne: '' } })
        .select('_id amneziawg.address')
        .lean();
    const reserved = new Set(existing.map(u => u?.amneziawg?.address).filter(Boolean));

    for (const user of list) {
        let current = user.amneziawg || {};
        const needsHiddenPeerFields = user._id && (!current.privateKey || !current.presharedKey);
        if (needsHiddenPeerFields) {
            const fresh = await HyUser.findById(user._id)
                .select('+amneziawg.privateKey +amneziawg.presharedKey amneziawg.publicKey amneziawg.address')
                .lean();
            if (fresh?.amneziawg) {
                current = {
                    ...current,
                    privateKey: current.privateKey || fresh.amneziawg.privateKey || '',
                    publicKey: current.publicKey || fresh.amneziawg.publicKey || '',
                    presharedKey: current.presharedKey || fresh.amneziawg.presharedKey || '',
                    address: current.address || fresh.amneziawg.address || '',
                };
                user.amneziawg = current;
            }
        }
        if (current.address) reserved.delete(current.address);

        const updates = {};
        let privateKey = current.privateKey;
        let publicKey = current.publicKey;

        if (!isBase64Key(privateKey)) {
            const pair = generateWireGuardKeyPair();
            privateKey = pair.privateKey;
            publicKey = pair.publicKey;
            updates['amneziawg.privateKey'] = privateKey;
            updates['amneziawg.publicKey'] = publicKey;
        } else if (!isBase64Key(publicKey)) {
            publicKey = privateKeyToPublic(privateKey);
            updates['amneziawg.publicKey'] = publicKey;
        }

        let presharedKey = current.presharedKey;
        if (!isBase64Key(presharedKey)) {
            presharedKey = randomKey();
            updates['amneziawg.presharedKey'] = presharedKey;
        }

        let address = current.address;
        if (!address) {
            address = peerAddressFromUserId(user.userId || user._id, cidr, reserved);
            updates['amneziawg.address'] = address;
        } else {
            reserved.add(address);
        }

        user.amneziawg = { privateKey, publicKey, presharedKey, address };
        if (Object.keys(updates).length > 0 && user._id) {
            await HyUser.updateOne({ _id: user._id }, { $set: updates });
        }
    }

    return list;
}

function ensureNodeKeys(node) {
    const current = ensureAwg2Parameters(node.amneziawg || {}, { replaceLegacyPlaceholders: true });
    const cfg = normalizeConfig(current);
    if (!isBase64Key(cfg.privateKey)) {
        const pair = generateWireGuardKeyPair();
        cfg.privateKey = pair.privateKey;
        cfg.publicKey = pair.publicKey;
    } else if (!isBase64Key(cfg.publicKey)) {
        cfg.publicKey = privateKeyToPublic(cfg.privateKey);
    }
    node.amneziawg = { ...toPlainConfig(node.amneziawg || {}), ...cfg };
    return { privateKey: cfg.privateKey, publicKey: cfg.publicKey };
}

function renderAwgInterface(cfg, {
    includeAddress = true,
    includeListenPort = true,
    specialJunkMode = 'active',
} = {}) {
    const lines = ['[Interface]'];
    if (includeAddress) lines.push(`Address = ${cfg.serverAddress}`);
    if (!isBase64Key(cfg.privateKey)) {
        throw new Error('AmneziaWG server private key is missing or invalid');
    }
    lines.push(`PrivateKey = ${cfg.privateKey}`);
    if (includeListenPort) lines.push(`ListenPort = ${cfg.listenPort}`);
    if (cfg.mtu) lines.push(`MTU = ${cfg.mtu}`);
    if (includeListenPort) {
        const natCidr = normalizeIpv4Cidr(cfg.clientCidr);
        lines.push(`PostUp = sysctl -w net.ipv4.ip_forward=1 >/dev/null; EXT_IF=$(ip route show default 0.0.0.0/0 | awk '{print $5; exit}'); iptables -C FORWARD -i %i -j ACCEPT 2>/dev/null || iptables -A FORWARD -i %i -j ACCEPT; iptables -C FORWARD -o %i -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || iptables -A FORWARD -o %i -m state --state RELATED,ESTABLISHED -j ACCEPT; [ -n "$EXT_IF" ] && (iptables -t nat -C POSTROUTING -s ${natCidr} -o "$EXT_IF" -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -s ${natCidr} -o "$EXT_IF" -j MASQUERADE) || true`);
        lines.push(`PreDown = EXT_IF=$(ip route show default 0.0.0.0/0 | awk '{print $5; exit}'); iptables -D FORWARD -i %i -j ACCEPT 2>/dev/null || true; iptables -D FORWARD -o %i -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true; [ -n "$EXT_IF" ] && iptables -t nat -D POSTROUTING -s ${natCidr} -o "$EXT_IF" -j MASQUERADE 2>/dev/null || true`);
    }
    lines.push(`Jc = ${cfg.jc}`);
    lines.push(`Jmin = ${cfg.jmin}`);
    lines.push(`Jmax = ${cfg.jmax}`);
    lines.push(`S1 = ${cfg.s1}`);
    lines.push(`S2 = ${cfg.s2}`);
    lines.push(`S3 = ${cfg.s3}`);
    lines.push(`S4 = ${cfg.s4}`);
    ['h1', 'h2', 'h3', 'h4'].forEach(key => {
        if (cfg[key]) lines.push(`${key.toUpperCase()} = ${cfg[key]}`);
    });
    ['i1', 'i2', 'i3', 'i4', 'i5'].forEach(key => {
        if (!cfg[key]) return;
        const prefix = specialJunkMode === 'comment' ? '# ' : '';
        lines.push(`${prefix}${key.toUpperCase()} = ${cfg[key]}`);
    });
    return lines;
}

function generateServerConfig(node, users = []) {
    ensureNodeKeys(node);
    const cfg = normalizeConfig({ ...toPlainConfig(node.amneziawg || {}), listenPort: node.port || 51820 });
    const lines = renderAwgInterface(cfg, { specialJunkMode: 'comment' });

    users.forEach(user => {
        const peer = user.amneziawg || {};
        if (!isBase64Key(peer.publicKey) || !peer.address) return;
        lines.push('', '[Peer]');
        lines.push(`PublicKey = ${peer.publicKey}`);
        if (isBase64Key(peer.presharedKey)) lines.push(`PresharedKey = ${peer.presharedKey}`);
        lines.push(`AllowedIPs = ${peer.address}`);
    });

    return `${lines.join('\n')}\n`;
}

function formatEndpointHost(host) {
    const value = String(host || '').trim();
    if (value.includes(':') && !value.startsWith('[')) return `[${value}]`;
    return value;
}

function generateClientConfig(user, node) {
    const cfg = normalizeConfig({ ...toPlainConfig(node.amneziawg || {}), listenPort: node.port || 51820 });
    if (!isBase64Key(cfg.publicKey)) {
        throw new Error(`AmneziaWG node ${node.name || node._id || ''} has no public key; run Auto Setup or save the node first`);
    }
    const peer = user.amneziawg || {};
    const host = cfg.endpointHost || node.domain || node.ip;
    const lines = ['[Interface]'];
    lines.push(`PrivateKey = ${peer.privateKey}`);
    lines.push(`Address = ${peer.address}`);
    if (cfg.dns.length > 0) lines.push(`DNS = ${cfg.dns.join(', ')}`);
    if (cfg.mtu) lines.push(`MTU = ${cfg.mtu}`);
    lines.push(`Jc = ${cfg.jc}`);
    lines.push(`Jmin = ${cfg.jmin}`);
    lines.push(`Jmax = ${cfg.jmax}`);
    lines.push(`S1 = ${cfg.s1}`);
    lines.push(`S2 = ${cfg.s2}`);
    lines.push(`S3 = ${cfg.s3}`);
    lines.push(`S4 = ${cfg.s4}`);
    ['h1', 'h2', 'h3', 'h4', 'i1', 'i2', 'i3', 'i4', 'i5'].forEach(key => {
        if (cfg[key]) lines.push(`${key.toUpperCase()} = ${cfg[key]}`);
    });
    lines.push('', '[Peer]');
    lines.push(`PublicKey = ${cfg.publicKey}`);
    if (isBase64Key(peer.presharedKey)) lines.push(`PresharedKey = ${peer.presharedKey}`);
    lines.push(`Endpoint = ${formatEndpointHost(host)}:${node.port || 51820}`);
    lines.push(`AllowedIPs = ${cfg.allowedIPs.join(', ')}`);
    if (cfg.persistentKeepalive > 0) lines.push(`PersistentKeepalive = ${cfg.persistentKeepalive}`);
    return `${lines.join('\n')}\n`;
}

function generateAmneziaNativeConfig(user, node, options = {}) {
    const cfg = normalizeConfig({ ...toPlainConfig(node.amneziawg || {}), listenPort: node.port || 51820 });
    if (!isBase64Key(cfg.publicKey)) {
        throw new Error(`AmneziaWG node ${node.name || node._id || ''} has no public key; run Auto Setup or save the node first`);
    }
    const peer = user.amneziawg || {};
    const host = cfg.endpointHost || node.domain || node.ip;
    const config = generateClientConfig(user, node);
    const lastConfig = {
        config,
        hostName: host,
        port: node.port || 51820,
        client_priv_key: peer.privateKey,
        client_ip: peer.address,
        server_pub_key: cfg.publicKey,
        mtu: String(cfg.mtu || 1420),
        persistent_keep_alive: String(cfg.persistentKeepalive || 0),
        allowed_ips: cfg.allowedIPs,
        Jc: String(cfg.jc),
        Jmin: String(cfg.jmin),
        Jmax: String(cfg.jmax),
        S1: String(cfg.s1),
        S2: String(cfg.s2),
        S3: String(cfg.s3),
        S4: String(cfg.s4),
        H1: cfg.h1,
        H2: cfg.h2,
        H3: cfg.h3,
        H4: cfg.h4,
    };
    if (isBase64Key(peer.presharedKey)) lastConfig.psk_key = peer.presharedKey;
    ['i1', 'i2', 'i3', 'i4', 'i5'].forEach(key => {
        if (cfg[key]) lastConfig[key.toUpperCase()] = cfg[key];
    });

    return {
        containers: [{
            container: 'amnezia-awg2',
            awg: {
                last_config: JSON.stringify(lastConfig),
                isThirdPartyConfig: true,
                port: String(node.port || 51820),
                transport_proto: 'udp',
                protocol_version: '2',
            },
        }],
        defaultContainer: 'amnezia-awg2',
        description: options.description || `${node.flag || ''} ${node.name || 'AmneziaWG'}`.trim() || 'AmneziaWG',
        hostName: host,
        dns1: cfg.dns[0] || '1.1.1.1',
        dns2: cfg.dns[1] || cfg.dns[0] || '8.8.8.8',
    };
}

function buildClientConfigs(user, nodes) {
    return nodes
        .filter(node => node.type === 'amneziawg')
        .map(node => ({
            name: `${node.flag || ''} ${node.name}`.trim(),
            filename: `${String(node.name || 'amneziawg').replace(/[^A-Za-z0-9._-]+/g, '-') || 'amneziawg'}.conf`,
            config: generateClientConfig(user, node),
            amneziaNativeConfig: generateAmneziaNativeConfig(user, node),
        }));
}

module.exports = {
    DEFAULTS,
    normalizeConfig,
    normalizeStringList,
    normalizeIpv4Cidr,
    generateAwg2Parameters,
    ensureAwg2Parameters,
    buildConfigUpdate,
    generateWireGuardKeyPair,
    randomKey,
    isBase64Key,
    ensureUsersPeerMaterial,
    ensureNodeKeys,
    generateServerConfig,
    generateClientConfig,
    generateAmneziaNativeConfig,
    buildClientConfigs,
};
