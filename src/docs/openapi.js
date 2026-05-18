/**
 * OpenAPI 3.0 specification for C³ CELERITY API
 *
 * buildSpec(lang) applies optional i18n translations on top of the base English spec.
 * Supported langs: 'en' (default), 'ru'
 */

const { version } = require('../../package.json');
const i18n = require('./i18n');

const spec = {
    openapi: '3.0.3',
    info: {
        title: 'C³ CELERITY API',
        version,
        description: `
Management API for [C³ CELERITY](https://github.com/ClickDevTech/hysteria-panel) — Hysteria 2 panel by Click Connect.

## Authentication

Protected \`/api/*\` endpoints require authentication via an **API key** or an admin session cookie.
\`/api/auth\`, \`/api/files\`, \`/api/info\`, \`/api/login\`, \`/api/login/totp\`, and \`/api/logout\` do not require an API key.

Create keys in: **Panel → Settings → Security → API Keys**

\`\`\`
X-API-Key: ck_your_key_here
\`\`\`
or
\`\`\`
Authorization: Bearer ck_your_key_here
\`\`\`

## Scopes

| Scope | Access |
|-------|--------|
| \`users:read\` | Read users |
| \`users:write\` | Create / update / delete users |
| \`nodes:read\` | Read nodes |
| \`nodes:write\` | Create / update / delete / sync nodes |
| \`stats:read\` | Stats and groups |
| \`sync:write\` | Trigger sync, kick users |
| \`mcp:enabled\` | MCP JSON-RPC endpoint |

Admin sessions (cookie) bypass scope checks entirely.
        `.trim(),
        contact: {
            name: 'Click Connect',
            url: 'https://github.com/ClickDevTech/hysteria-panel',
        },
        license: {
            name: 'MIT',
            url: 'https://github.com/ClickDevTech/hysteria-panel/blob/main/LICENSE',
        },
    },

    servers: [
        { url: '/api', description: 'Current server' },
    ],

    components: {
        securitySchemes: {
            ApiKeyHeader: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key',
                description: 'API key in `X-API-Key` header',
            },
            BearerToken: {
                type: 'http',
                scheme: 'bearer',
                description: 'API key as Bearer token',
            },
        },

        schemas: {
            Error: {
                type: 'object',
                properties: {
                    error: { type: 'string', example: 'Authentication required' },
                },
            },
            ScopeError: {
                type: 'object',
                properties: {
                    error: { type: 'string', example: 'Insufficient permissions' },
                    required: { type: 'string', example: 'users:write' },
                },
            },
            Pagination: {
                type: 'object',
                properties: {
                    page:  { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 50 },
                    total: { type: 'integer', example: 1234 },
                    pages: { type: 'integer', example: 25 },
                },
            },
            User: {
                type: 'object',
                properties: {
                    _id:               { type: 'string', example: '64a1b2c3d4e5f6a7b8c9d0e1' },
                    userId:            { type: 'string', example: '123456789' },
                    username:          { type: 'string', example: 'JohnDoe' },
                    enabled:           { type: 'boolean', example: true },
                    groups:            { type: 'array', items: { $ref: '#/components/schemas/GroupRef' } },
                    nodes:             { type: 'array', items: { $ref: '#/components/schemas/NodeRef' } },
                    trafficLimit:      { type: 'integer', example: 10737418240, description: 'Bytes, 0 = unlimited' },
                    maxDevices:        { type: 'integer', example: 3, description: '0 = from group, -1 = unlimited' },
                    hwidMode:          { type: 'string', enum: ['inherit', 'off', 'strict'], description: 'Override panel HWID mode' },
                    hwidEnforceFrom:   { type: 'string', format: 'date-time', nullable: true, description: 'Start enforcing HWID limit at this time (optional)' },
                    expireAt:          { type: 'string', format: 'date-time', nullable: true },
                    subscriptionToken: { type: 'string', example: 'abc123def456' },
                    traffic: {
                        type: 'object',
                        properties: {
                            tx: { type: 'integer', description: 'Bytes uploaded' },
                            rx: { type: 'integer', description: 'Bytes downloaded' },
                        },
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            UserCreate: {
                type: 'object',
                required: ['userId'],
                properties: {
                    userId:       { type: 'string', example: '123456789', description: 'Unique user ID (e.g. Telegram ID)' },
                    username:     { type: 'string', example: 'JohnDoe' },
                    enabled:      { type: 'boolean', default: false },
                    groups:       { type: 'array', items: { type: 'string' }, example: [] },
                    trafficLimit: { type: 'integer', example: 0, description: 'Bytes, 0 = unlimited' },
                    expireAt:     { type: 'string', format: 'date-time', nullable: true },
                },
            },
            UserUpdate: {
                type: 'object',
                properties: {
                    username:     { type: 'string' },
                    enabled:      { type: 'boolean' },
                    groups:       { type: 'array', items: { type: 'string' } },
                    trafficLimit: { type: 'integer' },
                    maxDevices:   { type: 'integer', description: '0 = from min of groups, -1 = unlimited' },
                    expireAt:     { type: 'string', format: 'date-time', nullable: true },
                    hwidMode:     { type: 'string', enum: ['inherit', 'off', 'strict'] },
                    hwidEnforceFrom: { type: 'string', format: 'date-time', nullable: true },
                },
            },
            UserDevice: {
                type: 'object',
                properties: {
                    _id:         { type: 'string' },
                    userId:      { type: 'string' },
                    hwid:        { type: 'string' },
                    platform:    { type: 'string' },
                    osVersion:   { type: 'string' },
                    deviceModel: { type: 'string' },
                    userAgent:   { type: 'string' },
                    firstSeenAt: { type: 'string', format: 'date-time' },
                    lastSeenAt:  { type: 'string', format: 'date-time' },
                },
            },
            UserDeviceListResponse: {
                type: 'object',
                properties: {
                    userId:  { type: 'string' },
                    count:   { type: 'integer' },
                    limit:   { type: 'integer', description: 'Effective maxDevices for HWID (same rules as auth)' },
                    devices: { type: 'array', items: { $ref: '#/components/schemas/UserDevice' } },
                },
            },
            Node: {
                type: 'object',
                properties: {
                    _id:           { type: 'string', example: '64a1b2c3d4e5f6a7b8c9d0e1' },
                    name:          { type: 'string', example: 'Germany' },
                    ip:            { type: 'string', example: '1.2.3.4' },
                    domain:        { type: 'string', example: 'de.example.com' },
                    port:          { type: 'integer', example: 443 },
                    portRange:     { type: 'string', example: '20000-50000' },
                    status:        { type: 'string', enum: ['online', 'offline', 'error', 'syncing'], example: 'online' },
                    active:        { type: 'boolean', example: true },
                    onlineUsers:   { type: 'integer', example: 42 },
                    maxOnlineUsers: { type: 'integer', example: 200, description: '0 = unlimited' },
                    groups:        { type: 'array', items: { $ref: '#/components/schemas/GroupRef' } },
                    lastSync:      { type: 'string', format: 'date-time', nullable: true },
                    lastError:     { type: 'string', example: '' },
                    traffic: {
                        type: 'object',
                        properties: {
                            tx: { type: 'integer' },
                            rx: { type: 'integer' },
                        },
                    },
                    // Hysteria 2 advanced configuration
                    hopInterval:            { type: 'string', example: '30s', description: 'Port-hopping interval' },
                    ignoreClientBandwidth:  { type: 'boolean', example: false },
                    speedTest:              { type: 'boolean', example: false },
                    disableUDP:             { type: 'boolean', example: false },
                    udpIdleTimeout:         { type: 'string', example: '60s' },
                    acme: {
                        type: 'object',
                        properties: {
                            email:       { type: 'string' },
                            ca:          { type: 'string', example: 'letsencrypt' },
                            listenHost:  { type: 'string', example: '0.0.0.0' },
                            type:        { type: 'string', enum: ['', 'http', 'tls', 'dns'] },
                            httpAltPort: { type: 'integer', example: 0 },
                            tlsAltPort:  { type: 'integer', example: 0 },
                            dnsName:     { type: 'string' },
                            dnsConfig:   { type: 'object' },
                        },
                    },
                    masquerade: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['proxy', 'string'], example: 'proxy' },
                            proxy: {
                                type: 'object',
                                properties: {
                                    url:         { type: 'string', example: 'https://www.google.com' },
                                    rewriteHost: { type: 'boolean' },
                                    insecure:    { type: 'boolean' },
                                },
                            },
                            string: {
                                type: 'object',
                                properties: {
                                    content:    { type: 'string' },
                                    headers:    { type: 'object' },
                                    statusCode: { type: 'integer', example: 503 },
                                },
                            },
                            listenHTTP:  { type: 'string', description: 'HTTP listen address for masquerade' },
                            listenHTTPS: { type: 'string', description: 'HTTPS listen address for masquerade' },
                            forceHTTPS:  { type: 'boolean' },
                        },
                    },
                    bandwidth: {
                        type: 'object',
                        properties: {
                            up:   { type: 'string', example: '1 gbps' },
                            down: { type: 'string', example: '1 gbps' },
                        },
                    },
                    sniff: {
                        type: 'object',
                        properties: {
                            enabled:       { type: 'boolean' },
                            enable:        { type: 'boolean', description: 'Enable sniffing within the protocol' },
                            timeout:       { type: 'string', example: '2s' },
                            rewriteDomain: { type: 'boolean' },
                            tcpPorts:      { type: 'string', example: '80,443,8000-9000' },
                            udpPorts:      { type: 'string', example: '443,80,53' },
                        },
                    },
                    quic: {
                        type: 'object',
                        properties: {
                            enabled:                 { type: 'boolean' },
                            initStreamReceiveWindow: { type: 'integer' },
                            maxStreamReceiveWindow:  { type: 'integer' },
                            initConnReceiveWindow:   { type: 'integer' },
                            maxConnReceiveWindow:    { type: 'integer' },
                            maxIdleTimeout:          { type: 'string', example: '60s' },
                            maxIncomingStreams:       { type: 'integer' },
                            disablePathMTUDiscovery: { type: 'boolean' },
                        },
                    },
                    resolver: {
                        type: 'object',
                        properties: {
                            enabled:       { type: 'boolean' },
                            type:          { type: 'string', enum: ['udp', 'tcp', 'tls', 'https'] },
                            udpAddr:       { type: 'string', example: '8.8.4.4:53' },
                            udpTimeout:    { type: 'string', example: '4s' },
                            tcpAddr:       { type: 'string', example: '8.8.8.8:53' },
                            tcpTimeout:    { type: 'string', example: '4s' },
                            tlsAddr:       { type: 'string', example: '1.1.1.1:853' },
                            tlsTimeout:    { type: 'string', example: '10s' },
                            tlsSni:        { type: 'string', example: 'cloudflare-dns.com' },
                            tlsInsecure:   { type: 'boolean' },
                            httpsAddr:     { type: 'string', example: '1.1.1.1:443' },
                            httpsTimeout:  { type: 'string', example: '10s' },
                            httpsSni:      { type: 'string', example: 'cloudflare-dns.com' },
                            httpsInsecure: { type: 'boolean' },
                        },
                    },
                    acl: {
                        type: 'object',
                        properties: {
                            enabled:           { type: 'boolean' },
                            type:              { type: 'string', enum: ['inline', 'file'] },
                            file:              { type: 'string' },
                            geoip:             { type: 'string' },
                            geosite:           { type: 'string' },
                            geoUpdateInterval: { type: 'string' },
                        },
                    },
                    aclRules: { type: 'array', items: { type: 'string' }, description: 'Inline ACL rules' },
                    useTlsFiles: { type: 'boolean', description: 'Whether to use TLS cert/key files instead of ACME' },
                },
            },
            GroupRef: {
                type: 'object',
                properties: {
                    _id:   { type: 'string' },
                    name:  { type: 'string', example: 'Europe' },
                    color: { type: 'string', example: '#6366f1' },
                },
            },
            NodeRef: {
                type: 'object',
                properties: {
                    _id:  { type: 'string' },
                    name: { type: 'string', example: 'Germany' },
                    ip:   { type: 'string', example: '1.2.3.4' },
                },
            },
            Stats: {
                type: 'object',
                properties: {
                    users: {
                        type: 'object',
                        properties: {
                            total:   { type: 'integer', example: 1234 },
                            enabled: { type: 'integer', example: 987 },
                        },
                    },
                    nodes: {
                        type: 'object',
                        properties: {
                            total:  { type: 'integer', example: 9 },
                            online: { type: 'integer', example: 9 },
                        },
                    },
                    onlineUsers: { type: 'integer', example: 639 },
                    nodesList: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name:   { type: 'string' },
                                online: { type: 'integer' },
                            },
                        },
                    },
                    lastSync: { type: 'string', format: 'date-time', nullable: true },
                },
            },
            Success: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                },
            },
            LoginResult: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    username: { type: 'string', example: 'admin' },
                    requiresTwoFactor: { type: 'boolean', example: false },
                    message: { type: 'string' },
                },
            },
            SubscriptionInfo: {
                type: 'object',
                properties: {
                    enabled: { type: 'boolean' },
                    groups: { type: 'array', items: { type: 'object' } },
                    traffic: {
                        type: 'object',
                        properties: {
                            used: { type: 'integer', description: 'Bytes used' },
                            limit: { type: 'integer', description: 'Bytes, 0 = unlimited' },
                        },
                    },
                    expire: { type: 'string', format: 'date-time', nullable: true },
                    servers: { type: 'integer' },
                },
            },
            CascadeLink: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    name: { type: 'string', example: 'Portal to Bridge' },
                    mode: { type: 'string', enum: ['reverse', 'forward'], example: 'reverse' },
                    portalNode: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/NodeRef' }] },
                    bridgeNode: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/NodeRef' }] },
                    tunnelUuid: { type: 'string', format: 'uuid' },
                    tunnelPort: { type: 'integer', example: 10086 },
                    tunnelDomain: { type: 'string', example: 'reverse.tunnel.internal' },
                    tunnelProtocol: { type: 'string', enum: ['vless', 'vmess'] },
                    tunnelSecurity: { type: 'string', enum: ['none', 'tls', 'reality'] },
                    tunnelTransport: { type: 'string', enum: ['tcp', 'ws', 'grpc', 'xhttp', 'splithttp'] },
                    active: { type: 'boolean' },
                    status: { type: 'string', enum: ['pending', 'deployed', 'online', 'offline', 'error'] },
                    lastError: { type: 'string' },
                    lastHealthCheck: { type: 'string', format: 'date-time', nullable: true },
                    latencyMs: { type: 'integer', nullable: true },
                    geoRouting: { type: 'object' },
                },
            },
            JsonRpcRequest: {
                type: 'object',
                required: ['jsonrpc', 'method'],
                properties: {
                    jsonrpc: { type: 'string', example: '2.0' },
                    id: { nullable: true, oneOf: [{ type: 'string' }, { type: 'integer' }] },
                    method: { type: 'string', example: 'tools/list' },
                    params: { type: 'object' },
                },
            },
            JsonRpcResponse: {
                type: 'object',
                properties: {
                    jsonrpc: { type: 'string', example: '2.0' },
                    id: { nullable: true, oneOf: [{ type: 'string' }, { type: 'integer' }] },
                    result: { type: 'object' },
                    error: { type: 'object' },
                },
            },
        },

        responses: {
            Unauthorized: {
                description: 'Invalid or missing API key',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
            Forbidden: {
                description: 'Missing required scope or IP not in allowlist',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ScopeError' } } },
            },
            NotFound: {
                description: 'Resource not found',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
            RateLimited: {
                description: 'Rate limit exceeded',
                headers: {
                    'X-RateLimit-Limit':     { schema: { type: 'integer' } },
                    'X-RateLimit-Remaining': { schema: { type: 'integer' } },
                },
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
        },

        parameters: {
            userId: {
                name: 'userId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
                example: '123456789',
            },
            nodeId: {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
                description: 'Node ObjectId',
            },
        },
    },

    security: [
        { ApiKeyHeader: [] },
        { BearerToken: [] },
    ],

    tags: [
        { name: 'Auth',   description: 'Admin session login/logout and node HTTP auth' },
        { name: 'Stats',  description: 'Panel statistics and server groups' },
        { name: 'Users',  description: 'User management — scope: `users:read` / `users:write`' },
        { name: 'Nodes',  description: 'Node management — scope: `nodes:read` / `nodes:write`' },
        { name: 'Cascade', description: 'Cascade tunnel management — scope: `nodes:read` / `nodes:write`' },
        { name: 'MCP',    description: 'Model Context Protocol endpoint — scope: `mcp:enabled`' },
        { name: 'Sync',   description: 'Synchronization and user kicking — scope: `sync:write`' },
        { name: 'Public', description: 'Public endpoints — no authentication required' },
    ],

    paths: {

        // ── Public ─────────────────────────────────────────────────────────────

        '/login': {
            post: {
                tags: ['Auth'],
                summary: 'Create admin session',
                description: 'Authenticates an admin by username/password. If TOTP is enabled, returns 202 and requires `/login/totp` with the same cookie session.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['username', 'password'],
                                properties: {
                                    username: { type: 'string', example: 'admin' },
                                    password: { type: 'string', format: 'password' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResult' } } } },
                    202: { description: 'Two-factor verification required', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResult' } } } },
                    400: { $ref: '#/components/responses/Unauthorized' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    429: { $ref: '#/components/responses/RateLimited' },
                },
            },
        },

        '/login/totp': {
            post: {
                tags: ['Auth'],
                summary: 'Complete admin login with TOTP',
                description: 'Completes a pending `/login` flow for admins with two-factor authentication enabled.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['token'],
                                properties: {
                                    token: { type: 'string', example: '123456' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResult' } } } },
                    400: { $ref: '#/components/responses/Unauthorized' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    429: { $ref: '#/components/responses/RateLimited' },
                },
            },
        },

        '/logout': {
            post: {
                tags: ['Auth'],
                summary: 'Destroy admin session',
                security: [],
                responses: {
                    200: { description: 'Logged out', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                },
            },
        },

        '/auth': {
            post: {
                tags: ['Auth'],
                summary: 'Validate user on node connection',
                description: 'Called by Hysteria nodes to authenticate clients. No API key required.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['auth'],
                                properties: {
                                    addr: { type: 'string', example: '1.2.3.4:12345', description: 'Client IP:port' },
                                    auth: { type: 'string', example: 'userId:password' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Auth result',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean', example: true },
                                        id: { type: 'string', example: '123456789', description: 'userId (only when ok=true)' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },

        '/files/{token}': {
            get: {
                tags: ['Public'],
                summary: 'Get subscription config',
                description: 'Serves a browser HTML page when opened in a browser without `format`; otherwise auto-detects app format from User-Agent and returns subscription content. HAPP-specific routing/HWID headers may be included.',
                security: [],
                parameters: [
                    {
                        name: 'token',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'User subscription token',
                    },
                    {
                        name: 'format',
                        in: 'query',
                        schema: { type: 'string', enum: ['clash', 'yaml', 'singbox', 'json', 'v2ray-json', 'shadowrocket', 'uri', 'raw'] },
                        description: 'Force output format (overrides User-Agent detection)',
                    },
                ],
                responses: {
                    200: { description: 'Subscription config or browser HTML page' },
                    403: { description: 'Subscription disabled, expired, traffic limit reached, or HWID soft-block response' },
                    404: { description: 'Token not found' },
                    429: { description: 'Subscription rate limit exceeded' },
                    503: { description: 'No servers available' },
                },
            },
        },

        '/info/{token}': {
            get: {
                tags: ['Public'],
                summary: 'Get subscription info',
                description: 'Returns traffic usage and expiry for the subscription.',
                security: [],
                parameters: [
                    {
                        name: 'token',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
                responses: {
                    200: {
                        description: 'Subscription info',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SubscriptionInfo' },
                            },
                        },
                    },
                    404: { description: 'Token not found' },
                },
            },
        },

        // ── Stats ──────────────────────────────────────────────────────────────

        '/stats': {
            get: {
                tags: ['Stats'],
                summary: 'Get panel statistics',
                description: 'Returns totals for users, nodes, and online connections.',
                responses: {
                    200: {
                        description: 'Statistics',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Stats' },
                            },
                        },
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/groups': {
            get: {
                tags: ['Stats'],
                summary: 'List server groups',
                responses: {
                    200: {
                        description: 'Array of groups',
                        content: {
                            'application/json': {
                                schema: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' } } } },
                            },
                        },
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        // ── Users ──────────────────────────────────────────────────────────────

        '/users': {
            get: {
                tags: ['Users'],
                summary: 'List users',
                description: 'Supports pagination, filtering, and sorting.',
                parameters: [
                    { name: 'page',      in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit',     in: 'query', schema: { type: 'integer', default: 50, maximum: 500 } },
                    { name: 'sortBy',    in: 'query', schema: { type: 'string', enum: ['createdAt', 'userId', 'username', 'enabled', 'traffic'], default: 'createdAt' } },
                    { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
                    { name: 'enabled',   in: 'query', schema: { type: 'boolean' }, description: 'Filter by enabled status' },
                    { name: 'group',     in: 'query', schema: { type: 'string' }, description: 'Filter by group ObjectId' },
                ],
                responses: {
                    200: {
                        description: 'Paginated user list',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        users:      { type: 'array', items: { $ref: '#/components/schemas/User' } },
                                        pagination: { $ref: '#/components/schemas/Pagination' },
                                    },
                                },
                            },
                        },
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    429: { $ref: '#/components/responses/RateLimited' },
                },
            },

            post: {
                tags: ['Users'],
                summary: 'Create user',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UserCreate' },
                        },
                    },
                },
                responses: {
                    201: {
                        description: 'Created user',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
                    },
                    400: { description: 'userId is required' },
                    409: { description: 'User already exists' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/users/{userId}': {
            parameters: [{ $ref: '#/components/parameters/userId' }],

            get: {
                tags: ['Users'],
                summary: 'Get user by ID',
                responses: {
                    200: { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },

            put: {
                tags: ['Users'],
                summary: 'Update user',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/UserUpdate' } } },
                },
                responses: {
                    200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },

            delete: {
                tags: ['Users'],
                summary: 'Delete user',
                responses: {
                    200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/users/{userId}/devices': {
            parameters: [{ $ref: '#/components/parameters/userId' }],
            get: {
                tags: ['Users'],
                summary: 'List HWID devices registered for user',
                responses: {
                    200: {
                        description: 'HWID devices',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/UserDeviceListResponse' } } },
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
            delete: {
                tags: ['Users'],
                summary: 'Delete all HWID devices for user',
                responses: {
                    200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/users/{userId}/devices/{hwid}': {
            parameters: [
                { $ref: '#/components/parameters/userId' },
                { name: 'hwid', in: 'path', required: true, schema: { type: 'string' }, description: 'HWID (URL-encoded if needed)' },
            ],
            delete: {
                tags: ['Users'],
                summary: 'Delete one HWID device',
                responses: {
                    200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/users/{userId}/enable': {
            parameters: [{ $ref: '#/components/parameters/userId' }],
            post: {
                tags: ['Users'],
                summary: 'Enable user',
                responses: {
                    200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/users/{userId}/disable': {
            parameters: [{ $ref: '#/components/parameters/userId' }],
            post: {
                tags: ['Users'],
                summary: 'Disable user',
                responses: {
                    200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/users/{userId}/groups': {
            parameters: [{ $ref: '#/components/parameters/userId' }],
            post: {
                tags: ['Users'],
                summary: 'Add user to groups',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['groups'],
                                properties: {
                                    groups: { type: 'array', items: { type: 'string' }, example: ['64a1b2c3d4e5f6a7b8c9d0e1'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/users/{userId}/groups/{groupId}': {
            parameters: [
                { $ref: '#/components/parameters/userId' },
                { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'Group ObjectId' },
            ],
            delete: {
                tags: ['Users'],
                summary: 'Remove user from group',
                responses: {
                    200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/users/sync-from-main': {
            post: {
                tags: ['Users'],
                summary: 'Bulk sync users from external source',
                description: 'Creates or updates users from an external/main database payload.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['users'],
                                properties: {
                                    users: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                userId: { type: 'string' },
                                                username: { type: 'string' },
                                                enabled: { type: 'boolean' },
                                                groups: { type: 'array', items: { type: 'string' } },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Sync result', content: { 'application/json': { schema: { type: 'object', properties: { created: { type: 'integer' }, updated: { type: 'integer' }, errors: { type: 'integer' } } } } } },
                    400: { description: '`users` must be an array' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        // ── Nodes ──────────────────────────────────────────────────────────────

        '/nodes': {
            get: {
                tags: ['Nodes'],
                summary: 'List nodes',
                parameters: [
                    { name: 'active', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
                    { name: 'status', in: 'query', schema: { type: 'string', enum: ['online', 'offline', 'error'] } },
                    { name: 'group',  in: 'query', schema: { type: 'string' }, description: 'Filter by group ObjectId' },
                ],
                responses: {
                    200: { description: 'Node list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Node' } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
            post: {
                tags: ['Nodes'],
                summary: 'Create node',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'ip'],
                                properties: {
                                    name:          { type: 'string', example: 'Germany' },
                                    ip:            { type: 'string', example: '1.2.3.4' },
                                    domain:        { type: 'string', example: 'de.example.com' },
                                    port:          { type: 'integer', example: 443 },
                                    portRange:     { type: 'string', example: '20000-50000' },
                                    statsPort:     { type: 'integer', example: 9999 },
                                    statsSecret:   { type: 'string', example: 'secret' },
                                    groups:        { type: 'array', items: { type: 'string' } },
                                    maxOnlineUsers: { type: 'integer', example: 0 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Created node', content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/nodes/check-ip': {
            get: {
                tags: ['Nodes'],
                summary: 'Check sibling nodes by IP',
                description: 'Returns protocol sibling nodes for a given IP address. Used by the UI when adding Hysteria/Xray nodes on the same host.',
                parameters: [
                    { name: 'ip', in: 'query', required: true, schema: { type: 'string' }, description: 'Node IP address' },
                ],
                responses: {
                    200: {
                        description: 'Matching nodes',
                        content: { 'application/json': { schema: { type: 'object', properties: { nodes: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, type: { type: 'string', enum: ['hysteria', 'xray'] }, name: { type: 'string' } } } } } } } },
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/nodes/{id}': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],

            get: {
                tags: ['Nodes'],
                summary: 'Get node by ID',
                responses: {
                    200: { description: 'Node', content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },

            put: {
                tags: ['Nodes'],
                summary: 'Update node',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object' } } },
                },
                responses: {
                    200: { description: 'Updated node', content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },

            delete: {
                tags: ['Nodes'],
                summary: 'Delete node',
                responses: {
                    200: { description: 'Deleted' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/status': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            get: {
                tags: ['Nodes'],
                summary: 'Get stored node status',
                description: 'Returns the status currently stored in the panel database.',
                responses: {
                    200: {
                        description: 'Node status',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status:      { type: 'string', enum: ['online', 'offline', 'error'] },
                                        onlineUsers: { type: 'integer' },
                                        lastError:   { type: 'string' },
                                        lastSync:    { type: 'string', format: 'date-time', nullable: true },
                                    },
                                },
                            },
                        },
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/reset-status': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            post: {
                tags: ['Nodes'],
                summary: 'Reset node status',
                description: 'Marks a node as online and clears the last error/health failure counter.',
                responses: {
                    200: { description: 'Status reset', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/agent-info': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            get: {
                tags: ['Nodes'],
                summary: 'Get Xray agent info',
                description: 'Fetches live info from the CC Agent for an Xray node.',
                responses: {
                    200: { description: 'Agent info', content: { 'application/json': { schema: { type: 'object' } } } },
                    400: { description: 'Node is not an Xray node' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    502: { description: 'Agent request failed' },
                },
            },
        },

        '/nodes/{id}/sync': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            post: {
                tags: ['Nodes'],
                summary: 'Sync specific node',
                description: 'Pushes the current config to this node via SSH.',
                responses: {
                    200: { description: 'Sync started/completed' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/setup': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            post: {
                tags: ['Nodes'],
                summary: 'Auto-setup node via SSH',
                description: `Full one-click node provisioning — same as the **⚙️ Auto Setup** button in the web panel.

**Steps performed:**
1. Install Hysteria 2 binary (if not installed)
2. Generate TLS certificate (self-signed, or prepare ACME dir if domain is set)
3. Upload \`/etc/hysteria/config.yaml\`
4. Configure iptables port hopping rules
5. Open firewall ports
6. Enable and restart \`hysteria-server\` systemd unit

**⚠️ Long-running:** this request can take **30 seconds to 2 minutes** depending on the server.  
Set your HTTP client timeout to at least **3 minutes**.

**Requires SSH credentials** to be configured on the node (password or private key).`,
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    installHysteria:  { type: 'boolean', default: true, description: 'Install/update Hysteria binary' },
                                    setupPortHopping: { type: 'boolean', default: true, description: 'Configure iptables NAT rules for port hopping range' },
                                    restartService:   { type: 'boolean', default: true, description: 'Enable and restart hysteria-server systemd unit' },
                                },
                            },
                            example: {
                                installHysteria: true,
                                setupPortHopping: true,
                                restartService: true,
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Setup completed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        logs:    { type: 'array', items: { type: 'string' }, description: 'Setup log lines' },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: 'SSH credentials not configured', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    500: {
                        description: 'Setup failed',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: false },
                                        error:   { type: 'string' },
                                        logs:    { type: 'array', items: { type: 'string' } },
                                    },
                                },
                            },
                        },
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/config': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            get: {
                tags: ['Nodes'],
                summary: 'Get generated node config',
                description: 'Returns the YAML config that would be applied to this node.',
                responses: {
                    200: { description: 'Hysteria 2 config YAML', content: { 'text/plain': { schema: { type: 'string' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/users': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            get: {
                tags: ['Nodes'],
                summary: 'List users assigned to node',
                responses: {
                    200: { description: 'User list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/groups': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            post: {
                tags: ['Nodes'],
                summary: 'Add node to groups',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', required: ['groups'], properties: { groups: { type: 'array', items: { type: 'string' } } } } } },
                },
                responses: {
                    200: { description: 'Updated node', content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } } },
                    400: { description: '`groups` must be an array' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/groups/{groupId}': {
            parameters: [
                { $ref: '#/components/parameters/nodeId' },
                { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'Group ObjectId' },
            ],
            delete: {
                tags: ['Nodes'],
                summary: 'Remove node from group',
                responses: {
                    200: { description: 'Updated node', content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/nodes/{id}/setup-port-hopping': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            post: {
                tags: ['Nodes'],
                summary: 'Configure port hopping',
                description: 'Applies iptables/NAT port-hopping rules on the node via SSH.',
                responses: {
                    200: { description: 'Configured', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    500: { description: 'Failed to configure port hopping' },
                },
            },
        },

        '/nodes/{id}/update-config': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            post: {
                tags: ['Nodes'],
                summary: 'Push generated config to node',
                description: 'Regenerates and uploads the node config via SSH/agent.',
                responses: {
                    200: { description: 'Config updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    500: { description: 'Failed to update config' },
                },
            },
        },

        '/nodes/{id}/generate-xray-keys': {
            parameters: [{ $ref: '#/components/parameters/nodeId' }],
            post: {
                tags: ['Nodes'],
                summary: 'Generate Xray REALITY keys',
                description: 'Generates x25519 keys on an Xray node via SSH and stores them on the node record.',
                responses: {
                    200: { description: 'Generated keys', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, privateKey: { type: 'string' }, publicKey: { type: 'string' } } } } } },
                    400: { description: 'Node is not Xray or SSH credentials are missing' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        // ── Cascade ────────────────────────────────────────────────────────────

        '/cascade/links': {
            get: {
                tags: ['Cascade'],
                summary: 'List cascade links',
                parameters: [
                    { name: 'active', in: 'query', schema: { type: 'boolean' } },
                    { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'deployed', 'online', 'offline', 'error'] } },
                    { name: 'nodeId', in: 'query', schema: { type: 'string' }, description: 'Filter links that touch this node' },
                ],
                responses: {
                    200: { description: 'Cascade links', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CascadeLink' } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
            post: {
                tags: ['Cascade'],
                summary: 'Create cascade link',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'portalNodeId', 'bridgeNodeId'],
                                properties: {
                                    name: { type: 'string' },
                                    portalNodeId: { type: 'string' },
                                    bridgeNodeId: { type: 'string' },
                                    mode: { type: 'string', enum: ['reverse', 'forward'], default: 'reverse' },
                                    tunnelPort: { type: 'integer', default: 10086 },
                                    tunnelProtocol: { type: 'string', enum: ['vless', 'vmess'], default: 'vless' },
                                    tunnelSecurity: { type: 'string', enum: ['none', 'tls', 'reality'], default: 'none' },
                                    tunnelTransport: { type: 'string', enum: ['tcp', 'ws', 'grpc', 'xhttp', 'splithttp'], default: 'tcp' },
                                    autoDeploy: { type: 'boolean', description: 'Deploy chain after creation' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Created link', content: { 'application/json': { schema: { $ref: '#/components/schemas/CascadeLink' } } } },
                    400: { description: 'Invalid topology or tunnel settings' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/cascade/links/{id}': {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Cascade link ObjectId' }],
            get: {
                tags: ['Cascade'],
                summary: 'Get cascade link',
                responses: {
                    200: { description: 'Cascade link', content: { 'application/json': { schema: { $ref: '#/components/schemas/CascadeLink' } } } },
                    400: { description: 'Invalid link ID' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
            put: {
                tags: ['Cascade'],
                summary: 'Update cascade link',
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
                responses: {
                    200: { description: 'Updated link', content: { 'application/json': { schema: { $ref: '#/components/schemas/CascadeLink' } } } },
                    400: { description: 'Invalid link settings' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
            delete: {
                tags: ['Cascade'],
                summary: 'Delete cascade link',
                description: 'Undeploys the link first when it is currently deployed/online/offline.',
                responses: {
                    200: { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    400: { description: 'Invalid link ID' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/cascade/links/{id}/reconnect': {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            patch: {
                tags: ['Cascade'],
                summary: 'Reconnect cascade link',
                description: 'Changes portal and/or bridge node, undeploying first when necessary.',
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { portalNodeId: { type: 'string' }, bridgeNodeId: { type: 'string' } } } } } },
                responses: {
                    200: { description: 'Updated link', content: { 'application/json': { schema: { $ref: '#/components/schemas/CascadeLink' } } } },
                    400: { description: 'Invalid reconnect request' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/cascade/links/{id}/deploy': {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            post: {
                tags: ['Cascade'],
                summary: 'Deploy cascade link',
                responses: {
                    200: { description: 'Deployed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    400: { description: 'Invalid link ID' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    429: { $ref: '#/components/responses/RateLimited' },
                    500: { description: 'Deploy failed' },
                },
            },
        },

        '/cascade/links/{id}/undeploy': {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            post: {
                tags: ['Cascade'],
                summary: 'Undeploy cascade link',
                responses: {
                    200: { description: 'Undeployed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    400: { description: 'Invalid link ID' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    429: { $ref: '#/components/responses/RateLimited' },
                },
            },
        },

        '/cascade/chain/deploy': {
            post: {
                tags: ['Cascade'],
                summary: 'Deploy cascade chain',
                description: 'Deploys the whole chain starting from `nodeId` or from the portal side of `linkId`.',
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { nodeId: { type: 'string' }, linkId: { type: 'string' } } } } } },
                responses: {
                    200: { description: 'Chain deployed', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, deployed: { type: 'integer' } } } } } },
                    400: { description: '`nodeId` or `linkId` is required' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    429: { $ref: '#/components/responses/RateLimited' },
                    500: { description: 'Chain deploy failed' },
                },
            },
        },

        '/cascade/links/{id}/health': {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            get: {
                tags: ['Cascade'],
                summary: 'Health-check cascade link',
                responses: {
                    200: { description: 'Health result', content: { 'application/json': { schema: { type: 'object', properties: { healthy: { type: 'boolean' }, status: { type: 'string' }, lastHealthCheck: { type: 'string', format: 'date-time', nullable: true }, latencyMs: { type: 'integer', nullable: true } } } } } },
                    400: { description: 'Invalid link ID' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                },
            },
        },

        '/cascade/topology': {
            get: {
                tags: ['Cascade'],
                summary: 'Get cascade topology',
                description: 'Returns the network graph used by the visual map.',
                responses: {
                    200: { description: 'Topology graph', content: { 'application/json': { schema: { type: 'object' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/cascade/topology/positions': {
            post: {
                tags: ['Cascade'],
                summary: 'Save cascade topology positions',
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['positions'], properties: { positions: { type: 'array', items: { type: 'object' } } } } } } },
                responses: {
                    200: { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
                    400: { description: '`positions` must be an array' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        // ── MCP ────────────────────────────────────────────────────────────────

        '/mcp': {
            post: {
                tags: ['MCP'],
                summary: 'MCP Streamable HTTP endpoint',
                description: 'JSON-RPC 2.0 endpoint for MCP methods such as `initialize`, `ping`, `tools/list`, `tools/call`, `prompts/list`, and `prompts/get`. `tools/call` and requests accepting `text/event-stream` respond as SSE.',
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/JsonRpcRequest' } } } },
                responses: {
                    200: { description: 'JSON-RPC response or SSE stream', content: { 'application/json': { schema: { $ref: '#/components/schemas/JsonRpcResponse' } }, 'text/event-stream': { schema: { type: 'string' } } } },
                    400: { description: 'Invalid JSON-RPC request' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/mcp/sse': {
            get: {
                tags: ['MCP'],
                summary: 'Open legacy MCP SSE stream',
                description: 'Legacy MCP transport. Emits an `endpoint` event containing `/api/mcp/messages?sessionId=...`.',
                responses: {
                    200: { description: 'SSE stream', content: { 'text/event-stream': { schema: { type: 'string' } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/mcp/messages': {
            post: {
                tags: ['MCP'],
                summary: 'Send legacy MCP SSE message',
                parameters: [{ name: 'sessionId', in: 'query', required: true, schema: { type: 'string' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/JsonRpcRequest' } } } },
                responses: {
                    202: { description: 'Accepted; response is sent on the SSE stream' },
                    400: { description: 'Session not found or invalid JSON-RPC request' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/mcp/tools': {
            get: {
                tags: ['MCP'],
                summary: 'List MCP tools',
                responses: {
                    200: { description: 'Tool list', content: { 'application/json': { schema: { type: 'object', properties: { tools: { type: 'array', items: { type: 'object' } } } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/mcp/prompts': {
            get: {
                tags: ['MCP'],
                summary: 'List MCP prompts',
                responses: {
                    200: { description: 'Prompt list', content: { 'application/json': { schema: { type: 'object', properties: { prompts: { type: 'array', items: { type: 'object' } } } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        // ── Sync ───────────────────────────────────────────────────────────────

        '/sync': {
            post: {
                tags: ['Sync'],
                summary: 'Sync all nodes',
                description: 'Pushes config to all active nodes in parallel. Returns immediately; sync runs in background.',
                responses: {
                    200: { description: 'Sync started', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', example: 'Sync started' } } } } } },
                    409: { description: 'Sync already in progress' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },

        '/kick/{userId}': {
            parameters: [{ $ref: '#/components/parameters/userId' }],
            post: {
                tags: ['Sync'],
                summary: 'Kick user from all nodes',
                description: 'Forcibly disconnects the user from all Hysteria nodes they are connected to.',
                responses: {
                    200: { description: 'Kicked', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
    },
};

/**
 * Apply i18n translations to the spec.
 * Overrides: info.description, tags descriptions, and per-operation summary/description.
 */
function buildSpec(lang = 'en') {
    const t = i18n[lang];
    if (!t) return spec;

    // Deep clone to avoid mutating the base spec
    const out = JSON.parse(JSON.stringify(spec));

    if (t.info?.description) {
        out.info.description = t.info.description;
    }

    if (t.tags) {
        out.tags = t.tags;
    }

    if (t.operations) {
        for (const [pathMethod, override] of Object.entries(t.operations)) {
            // Key format: "METHOD /path" e.g. "GET /users/{userId}"
            const spaceIdx = pathMethod.indexOf(' ');
            const method = pathMethod.slice(0, spaceIdx).toLowerCase();
            const path = pathMethod.slice(spaceIdx + 1);

            if (out.paths[path]?.[method]) {
                if (override.summary !== undefined) out.paths[path][method].summary = override.summary;
                if (override.description !== undefined) out.paths[path][method].description = override.description;
            }
        }
    }

    if (t.replacements) {
        applyTextReplacements(out, t.replacements);
    }

    return out;
}

function applyTextReplacements(value, replacements) {
    if (!value || typeof value !== 'object') return;

    for (const [key, child] of Object.entries(value)) {
        if ((key === 'summary' || key === 'description' || key === 'title') && typeof child === 'string') {
            if (Object.prototype.hasOwnProperty.call(replacements, child)) {
                value[key] = replacements[child];
            }
            continue;
        }

        if (child && typeof child === 'object') {
            applyTextReplacements(child, replacements);
        }
    }
}

module.exports = { buildSpec };
