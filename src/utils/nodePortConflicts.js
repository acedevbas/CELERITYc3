function parsePort(value, fallback = 443) {
    const port = parseInt(value, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return fallback;
    return port;
}

function parsePortRange(range) {
    const value = String(range || '').trim();
    const match = value.match(/^(\d{1,5})\s*-\s*(\d{1,5})$/);
    if (!match) return null;
    const start = parsePort(match[1], 0);
    const end = parsePort(match[2], 0);
    if (!start || !end) return null;
    return [Math.min(start, end), Math.max(start, end)];
}

function udpIntervalsForNode(nodeLike) {
    const type = nodeLike?.type || 'hysteria';
    const intervals = [];
    if (type === 'hysteria') {
        const port = parsePort(nodeLike.port, 443);
        intervals.push({ start: port, end: port, label: `${port}/udp` });
        const range = parsePortRange(nodeLike.portRange);
        if (range) intervals.push({ start: range[0], end: range[1], label: `${range[0]}-${range[1]}/udp` });
    } else if (type === 'amneziawg') {
        const port = parsePort(nodeLike.port, 51820);
        intervals.push({ start: port, end: port, label: `${port}/udp` });
    }
    return intervals;
}

function intervalsOverlap(a, b) {
    return a.start <= b.end && b.start <= a.end;
}

async function findUdpPortConflict(HyNode, candidate, options = {}) {
    if (!candidate?.ip || candidate.type === 'virtual') return null;
    const candidateIntervals = udpIntervalsForNode(candidate);
    if (candidateIntervals.length === 0) return null;

    const query = { ip: candidate.ip, type: { $in: ['hysteria', 'amneziawg'] } };
    if (options.excludeId) query._id = { $ne: options.excludeId };
    const siblings = await HyNode.find(query).select('name type port portRange').lean();

    for (const sibling of siblings) {
        const siblingIntervals = udpIntervalsForNode(sibling);
        for (const current of candidateIntervals) {
            for (const existing of siblingIntervals) {
                if (intervalsOverlap(current, existing)) {
                    return {
                        node: sibling,
                        current,
                        existing,
                        message: `UDP port conflict on ${candidate.ip}: ${candidate.type} uses ${current.label}, but ${sibling.name || sibling.type} (${sibling.type}) already uses ${existing.label}`,
                    };
                }
            }
        }
    }

    return null;
}

module.exports = {
    parsePort,
    parsePortRange,
    findUdpPortConflict,
};
