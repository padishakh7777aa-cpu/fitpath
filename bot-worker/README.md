# Бот LIGHTWEIGHT на Cloudflare Workers

Бесплатный бот **без сервера**: Cloudflare запускает его сам. Хватает на ~3000 пользователей с напоминаниями (лимиты бесплатного тарифа D1).
Команды те же, что у Python-бота (`../bot`): `/start /workout /motivation /remind 18:30 /tz Europe/Moscow /weekly on|off /stop /help`.

## Запуск: 3 шага

Нужны: Node.js, аккаунт Cloudflare (бесплатный), токен бота от @BotFather.

```bash
cd bot-worker
npm install
npx wrangler login                      # откроется браузер, войди в Cloudflare

# 1. База данных
npx wrangler d1 create lightweight      # скопируй database_id из ответа в wrangler.toml
npm run db:init                         # создаст таблицу

# 2. Секреты и публикация
npx wrangler secret put BOT_TOKEN       # вставь токен от BotFather
npx wrangler secret put WEBHOOK_SECRET  # придумай любую длинную строку (A-Z a-z 0-9 _ -)
npm run deploy                          # в конце покажет адрес: https://lightweight-bot.<имя>.workers.dev

# 3. Подключить Telegram к боту (вебхук, команды, кнопка меню)
BOT_TOKEN=... WEBHOOK_SECRET=... WORKER_URL=https://lightweight-bot.<имя>.workers.dev \
WEBAPP_URL=https://padishakh7777aa-cpu.github.io/fitpath/ npm run setup
```

Готово: напиши боту `/start`. Напоминания проверяются каждую минуту (расписание в `wrangler.toml`).

## Как это устроено
- `src/index.js` — вебхук (проверяет секрет), команды и рассылка по расписанию.
- `src/logic.js` — чистая логика: разбор времени, часовые пояса, «пора ли отправлять» (не повторяет в тот же день).
- `src/store.js` — хранилище: D1 в продакшене, память в тестах.
- Пользователь хранит только время, пояс и флаг воскресной проверки. Данные тренировок бот не видит.

## Проверка
`npm test` — 12 тестов (разбор, пояса, команды, лимит, рассылка, воскресенье, сбой отправки).
Локально: `npx wrangler d1 execute lightweight --local --file=schema.sql && npx wrangler dev --local --test-scheduled --var BOT_TOKEN:x --var WEBHOOK_SECRET:y`.

## Тарифы Cloudflare (бесплатный план)
Worker: 100 000 запросов в день. D1: 5 млн прочитанных строк в день. Расписание раз в минуту читает таблицу пользователей: при N пользователях это N×1440 строк в сутки.
