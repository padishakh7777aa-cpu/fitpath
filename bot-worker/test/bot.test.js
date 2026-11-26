import { test } from "node:test";
import assert from "node:assert/strict";
import { handleUpdate, runSchedule } from "../src/index.js";
import { MemStore } from "../src/store.js";
import { parseHHMM, validTz, localParts, dueMessages } from "../src/logic.js";

const env = { WEBAPP_URL: "https://x.github.io/fitpath/", DEFAULT_TZ: "UTC", MAX_USERS: "2" };
const mk = () => { const calls = []; return { calls, tg: async (method, body) => { calls.push({ method, ...body }); } }; };
const upd = (text, id = 1) => ({ message: { chat: { id }, text } });

test("parseHHMM принимает только корректное время", () => {
  assert.deepEqual(parseHHMM("18:30"), [18, 30]);
  assert.deepEqual(parseHHMM(" 7:05 "), [7, 5]);
  for (const bad of ["24:00", "12:60", "abc", "", "7", "12:3:4", null, undefined]) assert.equal(parseHHMM(bad), null);
});

test("validTz", () => {
  assert.equal(validTz("Europe/Moscow"), true);
  assert.equal(validTz("Not/AZone"), false);
  assert.equal(validTz(""), false);
});

test("localParts: время в разных поясах", () => {
  const t = new Date("2026-11-22T14:30:00Z"); // воскресенье
  assert.deepEqual(localParts("UTC", t), { date: "2026-11-22", hh: 14, mm: 30, dow: 0 });
  assert.deepEqual(localParts("Asia/Tashkent", t), { date: "2026-11-22", hh: 19, mm: 30, dow: 0 });
  assert.equal(localParts("Pacific/Auckland", t).date, "2026-11-23"); // уже понедельник
});

test("/start показывает кнопку приложения", async () => {
  const { calls, tg } = mk();
  await handleUpdate(upd("/start"), env, tg, new MemStore());
  assert.equal(calls[0].reply_markup.inline_keyboard[0][0].web_app.url, env.WEBAPP_URL);
  assert.match(calls[0].text, /LIGHTWEIGHT/);
});

test("/start@имя_бота тоже работает", async () => {
  const { calls, tg } = mk();
  await handleUpdate(upd("/start@my_bot"), env, tg, new MemStore());
  assert.match(calls[0].text, /LIGHTWEIGHT/);
});

test("/remind сохраняет время, неверный формат отклоняется", async () => {
  const { calls, tg } = mk(), store = new MemStore();
  await handleUpdate(upd("/remind 25:99"), env, tg, store);
  assert.match(calls[0].text, /Формат/);
  assert.equal(await store.get(1), null);
  await handleUpdate(upd("/remind 7:05"), env, tg, store);
  assert.equal((await store.get(1)).time, "07:05");
});

test("/tz, /weekly и /stop", async () => {
  const { tg } = mk(), store = new MemStore();
  await handleUpdate(upd("/remind 18:00"), env, tg, store);
  await handleUpdate(upd("/tz Europe/Moscow"), env, tg, store);
  await handleUpdate(upd("/tz Bad/Zone"), env, tg, store);
  assert.equal((await store.get(1)).tz, "Europe/Moscow");
  await handleUpdate(upd("/weekly on"), env, tg, store);
  assert.equal((await store.get(1)).weekly, 1);
  await handleUpdate(upd("/stop"), env, tg, store);
  assert.equal(await store.get(1), null);
});

test("лимит пользователей", async () => {
  const { calls, tg } = mk(), store = new MemStore();
  await handleUpdate(upd("/remind 10:00", 1), env, tg, store);
  await handleUpdate(upd("/remind 10:00", 2), env, tg, store);
  await handleUpdate(upd("/remind 10:00", 3), env, tg, store);
  assert.equal(await store.get(3), null);
  assert.match(calls[2].text, /недоступны/);
  await handleUpdate(upd("/remind 11:00", 1), env, tg, store); // существующий обновляется
  assert.equal((await store.get(1)).time, "11:00");
});

test("рассылка: ровно в нужную минуту, по поясу пользователя, один раз в день", async () => {
  const { calls, tg } = mk(), store = new MemStore();
  await store.put(1, { time: "19:30", tz: "Asia/Tashkent" });  // UTC+5 -> 14:30 UTC
  await store.put(2, { time: "14:30" });                       // по умолчанию UTC
  await store.put(3, { time: "09:00", tz: "UTC" });
  const t = new Date("2026-11-25T14:30:10Z");
  assert.equal(await runSchedule(env, tg, store, t), 2);
  assert.deepEqual(calls.map((c) => c.chat_id).sort(), [1, 2]);
  assert.equal(await runSchedule(env, tg, store, new Date("2026-11-25T14:30:50Z")), 0); // повтора в ту же минуту нет
  assert.equal(await runSchedule(env, tg, store, new Date("2026-11-26T14:30:10Z")), 2); // на следующий день снова
});

test("воскресная проверка отправляется только в воскресенье в 19:00", async () => {
  const { calls, tg } = mk(), store = new MemStore();
  await store.put(1, { weekly: true, tz: "UTC" });
  assert.equal(await runSchedule(env, tg, store, new Date("2026-11-25T19:00:00Z")), 0); // среда
  assert.equal(await runSchedule(env, tg, store, new Date("2026-11-22T19:00:00Z")), 1); // воскресенье
  assert.match(calls[0].text, /Итоги недели/);
});

test("ошибка отправки одному пользователю не ломает остальных", async () => {
  const store = new MemStore(); await store.put(1, { time: "10:00" }); await store.put(2, { time: "10:00" });
  const sent = [];
  const tg = async (m, b) => { if (b.chat_id === 1) throw new Error("blocked"); sent.push(b.chat_id); };
  assert.equal(await runSchedule(env, tg, store, new Date("2026-11-25T10:00:00Z")), 1);
  assert.deepEqual(sent, [2]);
});

test("dueMessages не срабатывает без настроек", () => {
  assert.deepEqual(dueMessages({}, "UTC", new Date()), []);
});
