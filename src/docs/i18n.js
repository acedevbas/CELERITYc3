/**
 * Russian translations for the OpenAPI spec.
 * Only overrides: info.description, tags[].description, and paths operation summaries/descriptions.
 * Merged on top of the base English spec by buildSpec(lang).
 */

module.exports = {
    ru: {
        info: {
            description: `
Управляющий API для [C³ CELERITY](https://github.com/ClickDevTech/hysteria-panel) — панели Hysteria 2 от Click Connect.

## Аутентификация

Защищённые эндпоинты \`/api/*\` требуют аутентификации через **API-ключ** или cookie-сессию администратора.
\`/api/auth\`, \`/api/files\`, \`/api/info\`, \`/api/login\`, \`/api/login/totp\` и \`/api/logout\` не требуют API-ключ.

Создать ключ: **Панель → Настройки → Безопасность → API-ключи**

\`\`\`
X-API-Key: ck_your_key_here
\`\`\`
или
\`\`\`
Authorization: Bearer ck_your_key_here
\`\`\`

## Скоупы

| Скоуп | Доступ |
|-------|--------|
| \`users:read\` | Чтение пользователей |
| \`users:write\` | Создание / изменение / удаление пользователей |
| \`nodes:read\` | Чтение нод |
| \`nodes:write\` | Создание / изменение / удаление / синхронизация нод |
| \`stats:read\` | Статистика и группы |
| \`sync:write\` | Запуск синхронизации, кик пользователей |
| \`mcp:enabled\` | JSON-RPC эндпоинт MCP |

Сессии администратора (cookie) полностью обходят проверку скоупов.
            `.trim(),
        },
        tags: [
            { name: 'Auth',   description: 'Вход/выход админской сессии и HTTP-аутентификация нод' },
            { name: 'Stats',  description: 'Статистика панели и группы серверов' },
            { name: 'Users',  description: 'Управление пользователями — скоуп: `users:read` / `users:write`' },
            { name: 'Nodes',  description: 'Управление нодами — скоуп: `nodes:read` / `nodes:write`' },
            { name: 'Cascade', description: 'Управление каскадными туннелями — скоуп: `nodes:read` / `nodes:write`' },
            { name: 'MCP',    description: 'Model Context Protocol эндпоинт — скоуп: `mcp:enabled`' },
            { name: 'Sync',   description: 'Синхронизация и кик пользователей — скоуп: `sync:write`' },
            { name: 'Public', description: 'Публичные эндпоинты — аутентификация не требуется' },
        ],
        operations: {
            'POST /login': {
                summary: 'Создать сессию администратора',
                description: 'Проверяет логин и пароль администратора. Если включён TOTP, возвращает 202 и требует завершить вход через `/login/totp` в той же cookie-сессии.',
            },
            'POST /login/totp': {
                summary: 'Завершить вход через TOTP',
                description: 'Завершает ожидающий вход администратора, у которого включена двухфакторная аутентификация.',
            },
            'POST /logout': {
                summary: 'Удалить сессию администратора',
                description: '',
            },
            'POST /auth': {
                summary: 'Проверить пользователя при подключении',
                description: 'Вызывается нодами Hysteria для аутентификации клиентов. API-ключ не требуется.',
            },
            'GET /files/{token}': {
                summary: 'Получить конфиг подписки',
                description: 'В браузере без `format` отдаёт HTML-страницу, для приложений автоматически определяет формат по User-Agent. Может добавлять HAPP routing/HWID заголовки.',
            },
            'GET /info/{token}': {
                summary: 'Получить информацию о подписке',
                description: 'Возвращает статус подписки, группы, использование/лимит трафика, дату истечения и число доступных серверов.',
            },
            'GET /stats': {
                summary: 'Статистика панели',
                description: 'Возвращает общее количество пользователей, нод и текущих подключений.',
            },
            'GET /groups': {
                summary: 'Список групп серверов',
                description: '',
            },
            'GET /users': {
                summary: 'Список пользователей',
                description: 'Поддерживает пагинацию, фильтрацию и сортировку.',
            },
            'POST /users': {
                summary: 'Создать пользователя',
                description: '',
            },
            'GET /users/{userId}': {
                summary: 'Получить пользователя по ID',
                description: '',
            },
            'PUT /users/{userId}': {
                summary: 'Обновить пользователя',
                description: '',
            },
            'DELETE /users/{userId}': {
                summary: 'Удалить пользователя',
                description: '',
            },
            'POST /users/{userId}/enable': {
                summary: 'Включить пользователя',
                description: '',
            },
            'POST /users/{userId}/disable': {
                summary: 'Отключить пользователя',
                description: '',
            },
            'POST /users/{userId}/groups': {
                summary: 'Добавить пользователя в группы',
                description: '',
            },
            'DELETE /users/{userId}/groups/{groupId}': {
                summary: 'Удалить пользователя из группы',
                description: '',
            },
            'GET /users/{userId}/devices': {
                summary: 'Список HWID-устройств пользователя',
                description: '',
            },
            'DELETE /users/{userId}/devices': {
                summary: 'Удалить все HWID-устройства пользователя',
                description: '',
            },
            'DELETE /users/{userId}/devices/{hwid}': {
                summary: 'Удалить одно HWID-устройство',
                description: '',
            },
            'POST /users/sync-from-main': {
                summary: 'Массово синхронизировать пользователей',
                description: 'Создаёт или обновляет пользователей из внешнего/основного источника данных.',
            },
            'GET /nodes': {
                summary: 'Список нод',
                description: '',
            },
            'POST /nodes': {
                summary: 'Создать ноду',
                description: '',
            },
            'GET /nodes/{id}': {
                summary: 'Получить ноду по ID',
                description: '',
            },
            'PUT /nodes/{id}': {
                summary: 'Обновить ноду',
                description: '',
            },
            'DELETE /nodes/{id}': {
                summary: 'Удалить ноду',
                description: '',
            },
            'GET /nodes/check-ip': {
                summary: 'Проверить соседние ноды по IP',
                description: 'Возвращает Hysteria/Xray ноды на том же IP. Используется интерфейсом при добавлении ноды.',
            },
            'GET /nodes/{id}/status': {
                summary: 'Получить сохранённый статус ноды',
                description: 'Возвращает статус, который сейчас сохранён в базе панели.',
            },
            'POST /nodes/{id}/reset-status': {
                summary: 'Сбросить статус ноды',
                description: 'Помечает ноду как online и очищает последнюю ошибку/счётчик health failures.',
            },
            'GET /nodes/{id}/agent-info': {
                summary: 'Получить информацию Xray-агента',
                description: 'Запрашивает live-информацию у CC Agent на Xray-ноде.',
            },
            'POST /nodes/{id}/sync': {
                summary: 'Синхронизировать конкретную ноду',
                description: 'Отправляет актуальный конфиг на ноду через SSH.',
            },
            'POST /nodes/{id}/setup': {
                summary: 'Автонастройка ноды через SSH',
                description: 'Полная one-click настройка Hysteria/Xray ноды. Запрос может выполняться 30 секунд - 2 минуты.',
            },
            'GET /nodes/{id}/config': {
                summary: 'Получить сгенерированный конфиг ноды',
                description: 'Возвращает YAML-конфиг, который будет применён к ноде.',
            },
            'GET /nodes/{id}/users': {
                summary: 'Список пользователей на ноде',
                description: '',
            },
            'POST /nodes/{id}/groups': {
                summary: 'Добавить ноду в группы',
                description: '',
            },
            'DELETE /nodes/{id}/groups/{groupId}': {
                summary: 'Удалить ноду из группы',
                description: '',
            },
            'POST /nodes/{id}/setup-port-hopping': {
                summary: 'Настроить port hopping',
                description: 'Применяет iptables/NAT правила port hopping на ноде через SSH.',
            },
            'POST /nodes/{id}/update-config': {
                summary: 'Отправить сгенерированный конфиг на ноду',
                description: 'Перегенерирует и загружает конфиг ноды через SSH/агент.',
            },
            'POST /nodes/{id}/generate-xray-keys': {
                summary: 'Сгенерировать REALITY ключи Xray',
                description: 'Генерирует x25519 ключи на Xray-ноде через SSH и сохраняет их в записи ноды.',
            },
            'GET /cascade/links': {
                summary: 'Список каскадных связей',
                description: '',
            },
            'POST /cascade/links': {
                summary: 'Создать каскадную связь',
                description: '',
            },
            'GET /cascade/links/{id}': {
                summary: 'Получить каскадную связь',
                description: '',
            },
            'PUT /cascade/links/{id}': {
                summary: 'Обновить каскадную связь',
                description: '',
            },
            'DELETE /cascade/links/{id}': {
                summary: 'Удалить каскадную связь',
                description: 'Если связь развёрнута, сначала удаляет каскадный конфиг с нод.',
            },
            'PATCH /cascade/links/{id}/reconnect': {
                summary: 'Переподключить каскадную связь',
                description: 'Меняет portal и/или bridge ноду, при необходимости сначала выполняя undeploy.',
            },
            'POST /cascade/links/{id}/deploy': {
                summary: 'Развернуть каскадную связь',
                description: '',
            },
            'POST /cascade/links/{id}/undeploy': {
                summary: 'Снять каскадную связь',
                description: '',
            },
            'POST /cascade/chain/deploy': {
                summary: 'Развернуть каскадную цепочку',
                description: 'Разворачивает всю цепочку, начиная от `nodeId` или от portal-стороны `linkId`.',
            },
            'GET /cascade/links/{id}/health': {
                summary: 'Проверить здоровье каскадной связи',
                description: '',
            },
            'GET /cascade/topology': {
                summary: 'Получить топологию каскада',
                description: 'Возвращает граф сети для визуальной карты.',
            },
            'POST /cascade/topology/positions': {
                summary: 'Сохранить позиции топологии',
                description: '',
            },
            'POST /mcp': {
                summary: 'Streamable HTTP эндпоинт MCP',
                description: 'JSON-RPC 2.0 эндпоинт MCP для `initialize`, `ping`, `tools/list`, `tools/call`, `prompts/list` и `prompts/get`.',
            },
            'GET /mcp/sse': {
                summary: 'Открыть legacy SSE поток MCP',
                description: 'Устаревший MCP transport. Отдаёт событие `endpoint` с URL `/api/mcp/messages?sessionId=...`.',
            },
            'POST /mcp/messages': {
                summary: 'Отправить сообщение legacy MCP SSE',
                description: 'Принимает JSON-RPC запрос и отправляет ответ в открытый SSE поток.',
            },
            'GET /mcp/tools': {
                summary: 'Список инструментов MCP',
                description: '',
            },
            'GET /mcp/prompts': {
                summary: 'Список промптов MCP',
                description: '',
            },
            'POST /sync': {
                summary: 'Синхронизировать все ноды',
                description: 'Отправляет конфиг на все активные ноды параллельно. Возвращает ответ немедленно — синхронизация идёт в фоне.',
            },
            'POST /kick/{userId}': {
                summary: 'Кикнуть пользователя со всех нод',
                description: 'Принудительно отключает пользователя от всех нод Hysteria.',
            },
        },
        replacements: {
            'Current server': 'Текущий сервер',
            'API key in `X-API-Key` header': 'API-ключ в заголовке `X-API-Key`',
            'API key as Bearer token': 'API-ключ как Bearer-токен',
            'Invalid or missing API key': 'API-ключ отсутствует или неверен',
            'Missing required scope or IP not in allowlist': 'Не хватает нужного скоупа или IP не в allowlist',
            'Resource not found': 'Ресурс не найден',
            'Rate limit exceeded': 'Превышен лимит запросов',
            'Bytes, 0 = unlimited': 'Байты, 0 = без лимита',
            'Bytes uploaded': 'Отправлено байт',
            'Bytes downloaded': 'Получено байт',
            'Bytes used': 'Использовано байт',
            '0 = unlimited': '0 = без лимита',
            '0 = from group, -1 = unlimited': '0 = из группы, -1 = без лимита',
            '0 = from min of groups, -1 = unlimited': '0 = минимум из групп, -1 = без лимита',
            'Override panel HWID mode': 'Переопределение режима HWID панели',
            'Start enforcing HWID limit at this time (optional)': 'Начать применять HWID-лимит с этого времени (опционально)',
            'Effective maxDevices for HWID (same rules as auth)': 'Итоговый maxDevices для HWID (те же правила, что в auth)',
            'Port-hopping interval': 'Интервал port hopping',
            'HTTP listen address for masquerade': 'HTTP-адрес прослушивания для маскировки',
            'HTTPS listen address for masquerade': 'HTTPS-адрес прослушивания для маскировки',
            'Enable sniffing within the protocol': 'Включить sniffing внутри протокола',
            'Inline ACL rules': 'Встроенные ACL-правила',
            'Whether to use TLS cert/key files instead of ACME': 'Использовать TLS cert/key файлы вместо ACME',
            'Unique user ID (e.g. Telegram ID)': 'Уникальный ID пользователя (например, Telegram ID)',
            'Node ObjectId': 'ObjectId ноды',
            'Group ObjectId': 'ObjectId группы',
            'User subscription token': 'Токен подписки пользователя',
            'Force output format (overrides User-Agent detection)': 'Принудительно выбрать формат (переопределяет определение по User-Agent)',
            'Client IP:port': 'IP:порт клиента',
            'userId (only when ok=true)': 'userId (только при ok=true)',
            'Auth result': 'Результат аутентификации',
            'Authenticated': 'Аутентификация успешна',
            'Two-factor verification required': 'Требуется двухфакторная проверка',
            'Logged out': 'Сессия завершена',
            'Subscription config or browser HTML page': 'Конфиг подписки или HTML-страница для браузера',
            'Subscription disabled, expired, traffic limit reached, or HWID soft-block response': 'Подписка отключена/истекла, достигнут лимит трафика или возвращён HWID soft-block',
            'Token not found': 'Токен не найден',
            'Subscription rate limit exceeded': 'Превышен лимит запросов к подписке',
            'No servers available': 'Нет доступных серверов',
            'Subscription info': 'Информация о подписке',
            'Statistics': 'Статистика',
            'Array of groups': 'Массив групп',
            'Paginated user list': 'Постраничный список пользователей',
            'Created user': 'Пользователь создан',
            'userId is required': 'Требуется userId',
            'User already exists': 'Пользователь уже существует',
            'User': 'Пользователь',
            'Updated user': 'Пользователь обновлён',
            'Deleted': 'Удалено',
            'HWID devices': 'HWID-устройства',
            'HWID (URL-encoded if needed)': 'HWID (URL-encoded при необходимости)',
            'Filter by enabled status': 'Фильтр по статусу включения',
            'Filter by active status': 'Фильтр по активности',
            'Filter by group ObjectId': 'Фильтр по ObjectId группы',
            'Filter links that touch this node': 'Фильтр связей, где участвует эта нода',
            '`users` must be an array': '`users` должен быть массивом',
            '`groups` must be an array': '`groups` должен быть массивом',
            '`positions` must be an array': '`positions` должен быть массивом',
            '`nodeId` or `linkId` is required': 'Требуется `nodeId` или `linkId`',
            'Sync result': 'Результат синхронизации',
            'Node IP address': 'IP-адрес ноды',
            'Matching nodes': 'Найденные ноды',
            'Node list': 'Список нод',
            'Created node': 'Нода создана',
            'Node': 'Нода',
            'Updated node': 'Нода обновлена',
            'Node status': 'Статус ноды',
            'Status reset': 'Статус сброшен',
            'Agent info': 'Информация агента',
            'Node is not an Xray node': 'Нода не является Xray-нодой',
            'Agent request failed': 'Запрос к агенту не удался',
            'Sync started/completed': 'Синхронизация запущена/завершена',
            'Setup completed successfully': 'Настройка успешно завершена',
            'Setup failed': 'Настройка не удалась',
            'Setup log lines': 'Строки лога настройки',
            'SSH credentials not configured': 'SSH-данные не настроены',
            'Install/update Hysteria binary': 'Установить/обновить бинарник Hysteria',
            'Configure iptables NAT rules for port hopping range': 'Настроить iptables NAT правила для диапазона port hopping',
            'Enable and restart hysteria-server systemd unit': 'Включить и перезапустить systemd unit hysteria-server',
            'Hysteria 2 config YAML': 'YAML-конфиг Hysteria 2',
            'User list': 'Список пользователей',
            'Configured': 'Настроено',
            'Failed to configure port hopping': 'Не удалось настроить port hopping',
            'Config updated': 'Конфиг обновлён',
            'Failed to update config': 'Не удалось обновить конфиг',
            'Generated keys': 'Ключи сгенерированы',
            'Node is not Xray or SSH credentials are missing': 'Нода не Xray или SSH-данные отсутствуют',
            'Cascade links': 'Каскадные связи',
            'Cascade link': 'Каскадная связь',
            'Created link': 'Связь создана',
            'Updated link': 'Связь обновлена',
            'Cascade link ObjectId': 'ObjectId каскадной связи',
            'Invalid link ID': 'Неверный ID связи',
            'Invalid link settings': 'Неверные настройки связи',
            'Invalid topology or tunnel settings': 'Неверная топология или настройки туннеля',
            'Invalid reconnect request': 'Неверный запрос переподключения',
            'Deploy chain after creation': 'Развернуть цепочку после создания',
            'Deploy failed': 'Развёртывание не удалось',
            'Deployed': 'Развёрнуто',
            'Undeployed': 'Снято',
            'Chain deployed': 'Цепочка развёрнута',
            'Chain deploy failed': 'Развёртывание цепочки не удалось',
            'Health result': 'Результат проверки здоровья',
            'Topology graph': 'Граф топологии',
            'Saved': 'Сохранено',
            'JSON-RPC response or SSE stream': 'JSON-RPC ответ или SSE-поток',
            'Invalid JSON-RPC request': 'Неверный JSON-RPC запрос',
            'SSE stream': 'SSE-поток',
            'Accepted; response is sent on the SSE stream': 'Принято; ответ будет отправлен в SSE-поток',
            'Session not found or invalid JSON-RPC request': 'Сессия не найдена или JSON-RPC запрос неверен',
            'Tool list': 'Список инструментов',
            'Prompt list': 'Список промптов',
            'Sync started': 'Синхронизация запущена',
            'Sync already in progress': 'Синхронизация уже выполняется',
            'Kicked': 'Пользователь отключён',
        },
    },
};
