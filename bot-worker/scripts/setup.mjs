// Одноразовая настройка бота: вебхук, команды, кнопка меню.
// Запуск: BOT_TOKEN=... WEBHOOK_SECRET=... WORKER_URL=https://lightweight-bot.<аккаунт>.workers.dev WEBAPP_URL=https://... node scripts/setup.mjs
const { BOT_TOKEN, WEBHOOK_SECRET, WORKER_URL, WEBAPP_URL } = process.env;
if (!BOT_TOKEN || !WEBHOOK_SECRET || !WORKER_URL || !WEBAPP_URL) { console.error("Задай BOT_TOKEN, WEBHOOK_SECRET, WORKER_URL, WEBAPP_URL"); process.exit(1); }
const call = async (m, b) => { const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${m}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); const j = await r.json(); console.log(m, j.ok ? "OK" : j); };
await call("setWebhook", { url: `${WORKER_URL.replace(/\/$/, "")}/webhook`, secret_token: WEBHOOK_SECRET, allowed_updates: ["message"], drop_pending_updates: true });
await call("setMyCommands", { commands: [
  { command: "start", description: "Открыть приложение" }, { command: "workout", description: "Начать тренировку" },
  { command: "motivation", description: "Мотивация" }, { command: "remind", description: "Ежедневное напоминание, напр. /remind 18:30" },
  { command: "tz", description: "Часовой пояс, напр. /tz Europe/Moscow" }, { command: "weekly", description: "Воскресная проверка: on или off" },
  { command: "stop", description: "Отключить напоминания" }, { command: "help", description: "Помощь" } ] });
await call("setChatMenuButton", { menu_button: { type: "web_app", text: "Тренировки", web_app: { url: WEBAPP_URL } } });
