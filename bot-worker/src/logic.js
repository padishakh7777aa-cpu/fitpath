// Чистая логика без обращения к сети: легко тестируется.
export const QUOTES = [
  "LIGHT WEIGHT, BABY! 💪", "YEAH BUDDY! 🔥", "Ain't nothin' but a peanut! 🥜",
  "Все хотят быть бодибилдерами, но никто не хочет поднимать по-настоящему тяжёлые веса.",
  "Боль — это слабость, покидающая тело.", "Сон, еда, тренировка. Повтори. Это и есть секрет.",
  "Техника сначала. Вес потом. Рекорды придут сами.", "Сегодняшняя тренировка — это то, что ты не пожалеешь через год.",
];

export const WELCOME =
  "🏆 <b>LIGHTWEIGHT</b>\n<i>Yeah buddy!</i>\n\nТвой тренер в кармане:\n" +
  "• 🏋️ тренировка с гидом: покажу, что делать, и подскажу вес\n• 🎬 техника упражнений в 3D\n" +
  "• 🥗 питание под цель и готовое меню\n• 📈 прогресс, рекорды и достижения\n\n" +
  "Жми кнопку и начинаем. <b>Light weight, baby!</b>\n\n" +
  "<i>Бот не заменяет врача. При проблемах со здоровьем сначала посоветуйся со специалистом.</i>";

export const HELP =
  "<b>Команды</b>\n/start — открыть приложение\n/workout — начать тренировку\n/motivation — заряд мотивации\n" +
  "/remind 18:30 — ежедневное напоминание\n/tz Europe/Moscow — твой часовой пояс\n" +
  "/weekly on — воскресная проверка итогов недели (off — выключить)\n/stop — отключить все напоминания";

/** '18:30' -> [18,30] или null */
export function parseHHMM(text) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(String(text ?? ""));
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return h < 24 && mi < 60 ? [h, mi] : null;
}

export function validTz(name) {
  try { new Intl.DateTimeFormat("en", { timeZone: name }); return typeof name === "string" && name.length > 0; }
  catch { return false; }
}

/** Местное время в часовом поясе: {date:'YYYY-MM-DD', hh, mm, dow(0=вс)} */
export function localParts(tz, now = new Date()) {
  const zone = validTz(tz) ? tz : "UTC";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
      .formatToParts(now).map((p) => [p.type, p.value]));
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hh: +parts.hour, mm: +parts.minute, dow };
}

/** Что отправить пользователю в эту минуту: [] | ['remind'] | ['weekly'] | оба. Не повторяет в тот же день. */
export function dueMessages(user, defaultTz, now = new Date()) {
  const out = [];
  const lp = localParts(user.tz || defaultTz, now);
  const t = parseHHMM(user.time);
  if (t && t[0] === lp.hh && t[1] === lp.mm && user.last_sent !== lp.date) out.push({ kind: "remind", mark: lp.date });
  if (user.weekly && lp.dow === 0 && lp.hh === 19 && lp.mm === 0 && user.last_weekly !== lp.date) out.push({ kind: "weekly", mark: lp.date });
  return out;
}

export const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];
