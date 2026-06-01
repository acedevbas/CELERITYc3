# Автодеплой через GHCR и Watchtower

Этот форк собирает Docker-образ в GitHub Container Registry:

```bash
ghcr.io/acedevbas/celerityc3:latest
```

После каждого push в `main` workflow `.github/workflows/docker.yml` собирает новый образ и публикует тег `latest`. Watchtower на сервере проверяет образ каждые 5 минут и перезапускает только контейнеры с label `com.centurylinklabs.watchtower.enable=true`.

## Первый запуск на сервере

1. Дождитесь, пока GitHub Actions успешно соберет образ после push в `main`.

2. Если GHCR package приватный, выполните на сервере login:

   ```bash
   echo '<GITHUB_PAT_WITH_READ_PACKAGES>' | docker login ghcr.io -u acedevbas --password-stdin
   ```

   Затем раскомментируйте в `docker-compose.hub.yml`:

   ```yaml
   - /root/.docker/config.json:/config.json:ro
   WATCHTOWER_REGISTRY_AUTH: "true"
   ```

   Если package сделан public, login не нужен.

3. Обновите compose-файл на сервере и запустите:

   ```bash
   docker compose -f docker-compose.hub.yml pull backend watchtower
   docker compose -f docker-compose.hub.yml up -d
   ```

4. Проверьте контейнеры:

   ```bash
   docker compose -f docker-compose.hub.yml ps
   docker logs --tail=100 hysteria-watchtower
   ```

## Ручное обновление

Watchtower обновит backend сам. Если нужно применить образ сразу:

```bash
docker compose -f docker-compose.hub.yml pull backend
docker compose -f docker-compose.hub.yml up -d backend
```

## Важно

Watchtower использует `/var/run/docker.sock`, то есть получает высокие права на Docker-хосте. Поэтому в compose включен `WATCHTOWER_LABEL_ENABLE=true`, а label обновления стоит только на `backend`.
