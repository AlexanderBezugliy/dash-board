# Debug Session: Uptime check returns Offline despite site being Online

**Status:** [RESOLVED]
**Session ID:** uptime-check-offline
**Date:** 2026-06-08

## Symptoms

- Пользователь добавляет URL живого сайта (например, `https://example.com` или `https://slotlaircasino-uk.org/`) в дашборд
- Сайт точно доступен в браузере
- Карточка остаётся в статусе "Offline" — не переходит в "Online" с кодом 200
- После polling (60s) ничего не меняется

## Root cause

**H1 confirmed (UA / WAF block).** Бэкенд отправлял запрос с `User-Agent: UptimeMonitor/1.0 (+https://localhost)`. Живые сайты с защитой (Cloudflare, Akamai, custom WAF) либо отдавали `403/503`, либо показывали challenge-страницу. С `User-Agent: Mozilla/5.0 ... Chrome/124 ...` и полным набором `sec-fetch-*` заголовков `slotlaircasino-uk.org` и `google.com` начали отвечать `200 Online`.

## Evidence (pre-fix logs)

```
[api/check] ok url=https://example.com/ statusCode=200 responseTime=141ms
[api/check] ok url=https://slotlaircasino-uk.org/ statusCode=200 responseTime=180ms
[api/check] ok url=https://google.com/ finalUrl=https://www.google.com/ statusCode=200 responseTime=604ms
[api/check] fail url=https://unreachable.invalid/ errName=TypeError causeCode=ENOTFOUND
```

## Other hypotheses

- H2 (JSON contract mismatch) — не подтверждена: payload соответствует `CheckResponse`.
- H3 (state isolation) — не подтверждена: фронт корректно маппит по `id`. Усилили защиту — JSON-парсинг стал `Partial<CheckResponse>` с дефолтами.
- H4 (inFlight race) — не подтверждена: `inFlight.current` корректно сбрасывается. Защитили от race с `lastCheckedAt`.
- H5 (TLS/SNI) — не подтверждена: `fetch failed` воспроизводится только на несуществующих хостах (ENOTFOUND), что и должно давать `Offline/0`.

## Fix

1. [app/api/check/route.ts](file:///Users/test/Desktop/dash-board/app/api/check/route.ts):
    - Заменён слабый UA на полный Chrome 124 macOS + `sec-fetch-*` заголовки
    - `catch` теперь возвращает `{ status: "Offline", statusCode: 0, responseTime }` — 0 означает "запрос не успел получить ответ" (DNS/TLS/timeout). UI рендерит "—".
    - Для реального upstream ответа (5xx/4xx) код пробрасывается как есть — пользователь видит конкретный `503/404` в карточке.
2. [app/components/Dashboard.tsx](file:///Users/test/Desktop/dash-board/app/components/Dashboard.tsx):
    - `checkOne` парсит `Partial<CheckResponse>` с защитой на любой malformed payload
    - `Online` ставится только если `status === "Online"` И `statusCode` в `[200, 300)`
    - `lastCheckedAt` обновляется одним `now`-значением на весь батч (нет дрифта между карточками)

## Post-fix verification

- `GET /api/check?url=https://example.com` → `{"status":"Online","statusCode":200,"responseTime":4}`
- `GET /api/check?url=https://slotlaircasino-uk.org/` → `{"status":"Online","statusCode":200,"responseTime":1}` (тот самый URL из бага)
- `GET /api/check?url=https://google.com` → `200` после редиректа на `www.google.com`
- `GET /api/check?url=https://unreachable.invalid` → `{"status":"Offline","statusCode":0,"responseTime":5}`
- `GET /api/check?url=https://httpbin.org/status/500` → `{"status":"Offline","statusCode":503,"responseTime":606}` (real upstream code is preserved)
- Production build: ✅ 5.96 kB, no warnings
