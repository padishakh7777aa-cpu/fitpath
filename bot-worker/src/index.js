import { QUOTES, WELCOME, HELP, parseHHMM, validTz, dueMessages, pick } from "./logic.js";
import { D1Store } from "./store.js";

const api = (token, fetchFn = fetch) => async (method, body) => {
  const r = await fetchFn(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) console.error("telegram error", method, r.status, await r.text().catch(() => ""));
  return r;
};

const appButton = (env, text = "🏋️ Открыть тренировки") =>
  ({ inline_keyboard: [[{ text, web_app: { url: env.WEBAPP_URL } }]] });

/** Обработка одного обновления Telegram. tg(method, body) и store передаются снаружи (в тестах — подделки). */
export async function handleUpdate(update, env, tg, store, rnd = Math.random) {
  const msg = update.message;
  if (!msg || !msg.chat || typeof msg.text !== "string") return;
  const chat = msg.chat.id;
  const [rawCmd, ...args] = msg.text.trim().split(/\s+/);
  const cmd = rawCmd.startsWith("/") ? rawCmd.split("@")[0].toLowerCase() : null;
  const say = (text, extra = {}) => tg("sendMessage", { chat_id: chat, text, ...extra });
  const limit = +(env.MAX_USERS || 3000);

  switch (cmd) {
    case "/start": return say(WELCOME, { parse_mode: "HTML", reply_markup: appButton(env) });
    case "/workout": return say("Время тренироваться. Давай, чемпион! 🔥", { reply_markup: appButton(env, "▶ Начать тренировку") });
    case "/motivation": return say(pick(QUOTES, rnd));
    case "/help": return say(HELP, { parse_mode: "HTML" });
    case "/remind": {
      const t = parseHHMM(args[0]);
      if (!t) return say("Формат: /remind 18:30");
      if (!(await store.get(chat)) && (await store.count()) >= limit) return say("Сейчас новые напоминания временно недоступны.");
      const hhmm = `${String(t[0]).padStart(2, "0")}:${String(t[1]).padStart(2, "0")}`;
      const u = await store.put(chat, { time: hhmm, last_sent: null });
      return say(`Готово! Каждый день в ${hhmm} (${u.tz || env.DEFAULT_TZ || "UTC"}) напомню про тренировку. Yeah buddy! 💪\nЕсли время неверное, укажи свой пояс: /tz Europe/Moscow`);
    }
    case "/tz": {
      if (!args[0] || !validTz(args[0])) return say("Формат: /tz Europe/Moscow (например Asia/Tashkent, Europe/Kyiv)");
      await store.put(chat, { tz: args[0] });
      return say(`Часовой пояс: ${args[0]}`);
    }
    case "/weekly": {
      const a = (args[0] || "").toLowerCase();
      if (a !== "on" && a !== "off") return say("Формат: /weekly on или /weekly off");
      await store.put(chat, { weekly: a === "on" });
      return say(a === "on" ? "Воскресная проверка итогов включена 📅" : "Воскресная проверка выключена.");
    }
    case "/stop": await store.del(chat); return say("Напоминания отключены. Но лёгкий вес сам себя не поднимет 😉");
    default: return say(pick(QUOTES, rnd), { reply_markup: appButton(env) });
  }
}

/** Рассылка по расписанию (вызывается каждую минуту). */
export async function runSchedule(env, tg, store, now = new Date()) {
  let sent = 0;
  for (const u of await store.scheduled()) {
    for (const d of dueMessages(u, env.DEFAULT_TZ || "UTC", now)) {
      try {
        if (d.kind === "remind") {
          await tg("sendMessage", { chat_id: u.chat_id, text: `⏰ Пора в зал!\n${pick(QUOTES)}`, reply_markup: appButton(env, "▶ Начать тренировку") });
          await store.put(u.chat_id, { last_sent: d.mark });
        } else {
          await tg("sendMessage", { chat_id: u.chat_id, text: "📅 Итоги недели готовы. Открой «Прогресс» и посмотри, сколько ты сделал и какие рекорды поставил.", reply_markup: appButton(env, "📈 Открыть прогресс") });
          await store.put(u.chat_id, { last_weekly: d.mark });
        }
        sent++;
      } catch (e) { console.error("send failed", u.chat_id, e); }
    }
  }
  return sent;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/") return new Response("LIGHTWEIGHT bot is running");
    if (req.method !== "POST" || url.pathname !== "/webhook") return new Response("Not found", { status: 404 });
    if (!env.WEBHOOK_SECRET || req.headers.get("x-telegram-bot-api-secret-token") !== env.WEBHOOK_SECRET)
      return new Response("Forbidden", { status: 403 });
    let update;
    try { update = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }
    try { await handleUpdate(update, env, api(env.BOT_TOKEN), new D1Store(env.DB)); }
    catch (e) { console.error("handler error", e); }
    return new Response("ok"); // всегда 200, чтобы Telegram не повторял обновление
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runSchedule(env, api(env.BOT_TOKEN), new D1Store(env.DB)));
  },
};
