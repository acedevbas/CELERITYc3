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
    jmin: 40,
    jmax: 70,
    s1: 0,
    s2: 0,
    s3: 0,
    s4: 0,
    h1: '1',
    h2: '2',
    h3: '3',
    h4: '4',
    i1: '',
    i2: '',
    i3: '',
    i4: '',
    i5: '',
    advancedSecurity: true,
};

function base64Key(buf) {
    return Buffer.from(buf).toString('base64');
}

function randomKey() {
    return base64Key(crypto.randomBytes(32));
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
    const cfg = { ...DEFAULTS, ...config };
    cfg.interfaceName = normalizeInterfaceName(cfg.interfaceName);
    cfg.serverAddress = String(cfg.serverAddress || DEFAULTS.serverAddress).trim();
    cfg.clientCidr = String(cfg.clientCidr || DEFAULTS.clientCidr).trim();
    cfg.dns = normalizeStringList(cfg.dns, DEFAULTS.dns);
    cfg.allowedIPs = normalizeStringList(cfg.allowedIPs, DEFAULTS.allowedIPs);
    cfg.mtu = Math.min(9000, Math.max(576, parseInt(cfg.mtu, 10) || DEFAULTS.mtu));
    cfg.persistentKeepalive = Math.min(65535, Math.max(0, parseInt(cfg.persistentKeepalive, 10) || DEFAULTS.persistentKeepalive));
    ['jc', 'jmin', 'jmax', 's1', 's2', 's3', 's4'].forEach(key => {
        cfg[key] = Math.min(65535, Math.max(0, parseInt(cfg[key], 10) || 0));
    });
    ['h1', 'h2', 'h3', 'h4', 'i1', 'i2', 'i3', 'i4', 'i5'].forEach(key => {
        cfg[key] = String(cfg[key] || '').trim();
    });
    cfg.advancedSecurity = cfg.advancedSecurity !== false;
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
        const current = user.amneziawg || {};
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
    const cfg = normalizeConfig(node.amneziawg || {});
    if (!isBase64Key(cfg.privateKey)) {
        const pair = generateWireGuardKeyPair();
        cfg.privateKey = pair.privateKey;
        cfg.publicKey = pair.publicKey;
    } else if (!isBase64Key(cfg.publicKey)) {
        cfg.publicKey = privateKeyToPublic(cfg.privateKey);
    }
    node.amneziawg = { ...(node.amneziawg || {}), ...cfg };
    return { privateKey: cfg.privateKey, publicKey: cfg.publicKey };
}

function renderAwgInterface(cfg, { includeAddress = true, includeListenPort = true } = {}) {
    const lines = ['[Interface]'];
    if (includeAddress) lines.push(`Address = ${cfg.serverAddress}`);
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
    ['h1', 'h2', 'h3', 'h4', 'i1', 'i2', 'i3', 'i4', 'i5'].forEach(key => {
        if (cfg[key]) lines.push(`${key.toUpperCase()} = ${cfg[key]}`);
    });
    return lines;
}

function generateServerConfig(node, users = []) {
    ensureNodeKeys(node);
    const cfg = normalizeConfig({ ...(node.amneziawg || {}), listenPort: node.port || 51820 });
    const lines = renderAwgInterface(cfg);

    users.forEach(user => {
        const peer = user.amneziawg || {};
        if (!isBase64Key(peer.publicKey) || !peer.address) return;
        lines.push('', '[Peer]');
        lines.push(`PublicKey = ${peer.publicKey}`);
        if (isBase64Key(peer.presharedKey)) lines.push(`PresharedKey = ${peer.presharedKey}`);
        lines.push(`AllowedIPs = ${peer.address}`);
        if (cfg.advancedSecurity) lines.push('AdvancedSecurity = true');
    });

    return `${lines.join('\n')}\n`;
}

function formatEndpointHost(host) {
    const value = String(host || '').trim();
    if (value.includes(':') && !value.startsWith('[')) return `[${value}]`;
    return value;
}

function generateClientConfig(user, node) {
    const cfg = normalizeConfig({ ...(node.amneziawg || {}), listenPort: node.port || 51820 });
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
    if (cfg.advancedSecurity) lines.push('AdvancedSecurity = true');
    return `${lines.join('\n')}\n`;
}

function buildClientConfigs(user, nodes) {
    return nodes
        .filter(node => node.type === 'amneziawg')
        .map(node => ({
            name: `${node.flag || ''} ${node.name}`.trim(),
            filename: `${String(node.name || 'amneziawg').replace(/[^A-Za-z0-9._-]+/g, '-') || 'amneziawg'}.conf`,
            config: generateClientConfig(user, node),
        }));
}

module.exports = {
    DEFAULTS,
    normalizeConfig,
    normalizeStringList,
    normalizeIpv4Cidr,
    generateWireGuardKeyPair,
    randomKey,
    isBase64Key,
    ensureUsersPeerMaterial,
    ensureNodeKeys,
    generateServerConfig,
    generateClientConfig,
    buildClientConfigs,
};
