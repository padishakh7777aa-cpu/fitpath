"""LIGHTWEIGHT — Telegram-бот для мини-приложения с тренировками.

Запуск:
  BOT_TOKEN=... WEBAPP_URL=https://<user>.github.io/fitpath/ python bot.py

Команды: /start /workout /motivation /remind HH:MM /tz Europe/Moscow /weekly on|off /stop /help
Неофициальный проект в духе легенды бодибилдинга; не связан с Ронни Коулманом.
"""
import json
import logging
import os
import random
import tempfile
from datetime import time
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from telegram import (BotCommand, InlineKeyboardButton, InlineKeyboardMarkup,
                      MenuButtonWebApp, Update, WebAppInfo)
from telegram.ext import (Application, CommandHandler, ContextTypes,
                          MessageHandler, filters)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("lightweight")

TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")
DEFAULT_TZ = os.environ.get("TIMEZONE", "UTC")
STORE = Path(os.environ.get("REMINDERS_FILE", "reminders.json"))
MAX_USERS = int(os.environ.get("MAX_USERS", "5000"))

QUOTES = [
    "LIGHT WEIGHT, BABY! 💪",
    "YEAH BUDDY! 🔥",
    "Ain't nothin' but a peanut! 🥜",
    "Все хотят быть бодибилдерами, но никто не хочет поднимать по-настоящему тяжёлые веса.",
    "Боль — это слабость, покидающая тело.",
    "Сон, еда, тренировка. Повтори. Это и есть секрет.",
    "Техника сначала. Вес потом. Рекорды придут сами.",
    "Сегодняшняя тренировка — это то, что ты не пожалеешь через год.",
]

WELCOME = (
    "🏆 <b>LIGHTWEIGHT</b>\n"
    "<i>Yeah buddy!</i>\n\n"
    "Твой тренер в кармане:\n"
    "• 🏋️ тренировка с гидом: покажу, что делать, и подскажу вес\n"
    "• 🎬 техника упражнений в 3D\n"
    "• 🥗 питание под цель и готовое меню\n"
    "• 📈 прогресс, рекорды и достижения\n\n"
    "Жми кнопку и начинаем. <b>Light weight, baby!</b>\n\n"
    "<i>Бот не заменяет врача. При проблемах со здоровьем сначала посоветуйся со специалистом.</i>"
)

HELP = (
    "<b>Команды</b>\n"
    "/start — открыть приложение\n"
    "/workout — начать тренировку\n"
    "/motivation — заряд мотивации\n"
    "/remind 18:30 — ежедневное напоминание\n"
    "/tz Europe/Moscow — твой часовой пояс\n"
    "/weekly on — воскресная проверка итогов недели (off — выключить)\n"
    "/stop — отключить все напоминания"
)


# ---------- хранилище ----------
def load() -> dict:
    try:
        data = json.loads(STORE.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except Exception:
        log.exception("Не удалось прочитать %s, начинаю с пустого", STORE)
        return {}
    # миграция старого формата {chat: "HH:MM"} -> {chat: {"time": "HH:MM"}}
    return {k: ({"time": v} if isinstance(v, str) else v) for k, v in data.items() if isinstance(v, (str, dict))}


def save(data: dict) -> None:
    """Атомарная запись: сначала во временный файл, потом замена."""
    STORE.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(STORE.parent), prefix=".rem_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp, STORE)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ---------- разбор ввода ----------
def parse_hhmm(text: str):
    """'18:30' -> (18, 30) или None, если формат неверный."""
    try:
        h, m = map(int, str(text).strip().split(":"))
    except Exception:
        return None
    return (h, m) if 0 <= h < 24 and 0 <= m < 60 else None


def get_tz(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return ZoneInfo("UTC")


def app_keyboard(text="🏋️ Открыть тренировки"):
    return InlineKeyboardMarkup([[InlineKeyboardButton(text, web_app=WebAppInfo(url=WEBAPP_URL))]])


# ---------- планировщик ----------
async def remind_job(ctx: ContextTypes.DEFAULT_TYPE):
    await ctx.bot.send_message(
        ctx.job.chat_id,
        f"⏰ Пора в зал!\n{random.choice(QUOTES)}",
        reply_markup=app_keyboard("▶ Начать тренировку"),
    )


async def weekly_job(ctx: ContextTypes.DEFAULT_TYPE):
    await ctx.bot.send_message(
        ctx.job.chat_id,
        "📅 Итоги недели готовы. Открой «Прогресс» и посмотри, сколько ты сделал и какие рекорды поставил.",
        reply_markup=app_keyboard("📈 Открыть прогресс"),
    )


def schedule(app: Application, chat_id: int, cfg: dict) -> None:
    tz = get_tz(cfg.get("tz", DEFAULT_TZ))
    for name in (f"r{chat_id}", f"w{chat_id}"):
        for j in app.job_queue.get_jobs_by_name(name):
            j.schedule_removal()
    t = parse_hhmm(cfg.get("time", ""))
    if t:
        app.job_queue.run_daily(remind_job, time(t[0], t[1], tzinfo=tz), chat_id=chat_id, name=f"r{chat_id}")
    if cfg.get("weekly"):
        app.job_queue.run_daily(weekly_job, time(19, 0, tzinfo=tz), days=(6,), chat_id=chat_id, name=f"w{chat_id}")


def _cfg(chat_id: int) -> dict:
    return load().get(str(chat_id), {})


def _put(chat_id: int, **fields) -> dict:
    data = load()
    if str(chat_id) not in data and len(data) >= MAX_USERS:
        raise RuntimeError("limit")
    cfg = data.setdefault(str(chat_id), {})
    cfg.update(fields)
    save(data)
    return cfg


# ---------- команды ----------
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(WELCOME, reply_markup=app_keyboard())


async def workout(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Время тренироваться. Давай, чемпион! 🔥", reply_markup=app_keyboard("▶ Начать тренировку"))


async def motivation(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(random.choice(QUOTES))


async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(HELP)


async def remind(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    t = parse_hhmm(ctx.args[0]) if ctx.args else None
    if not t:
        await update.message.reply_text("Формат: /remind 18:30")
        return
    chat = update.effective_chat.id
    try:
        cfg = _put(chat, time=f"{t[0]:02d}:{t[1]:02d}")
    except RuntimeError:
        await update.message.reply_text("Сейчас новые напоминания временно недоступны.")
        return
    schedule(ctx.application, chat, cfg)
    tz = cfg.get("tz", DEFAULT_TZ)
    await update.message.reply_text(
        f"Готово! Каждый день в {cfg['time']} ({tz}) напомню про тренировку. Yeah buddy! 💪\n"
        f"Если время неверное, укажи свой пояс: /tz Europe/Moscow"
    )


async def tz_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    name = ctx.args[0] if ctx.args else ""
    try:
        ZoneInfo(name)
    except Exception:
        await update.message.reply_text("Формат: /tz Europe/Moscow (название пояса из списка IANA, например Asia/Tashkent, Europe/Kyiv)")
        return
    chat = update.effective_chat.id
    cfg = _put(chat, tz=name)
    schedule(ctx.application, chat, cfg)
    await update.message.reply_text(f"Часовой пояс: {name}")


async def weekly(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    arg = (ctx.args[0].lower() if ctx.args else "")
    if arg not in ("on", "off"):
        await update.message.reply_text("Формат: /weekly on или /weekly off")
        return
    chat = update.effective_chat.id
    cfg = _put(chat, weekly=(arg == "on"))
    schedule(ctx.application, chat, cfg)
    await update.message.reply_text("Воскресная проверка итогов включена 📅" if arg == "on" else "Воскресная проверка выключена.")


async def stop(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat.id
    data = load()
    data.pop(str(chat), None)
    save(data)
    for name in (f"r{chat}", f"w{chat}"):
        for j in ctx.application.job_queue.get_jobs_by_name(name):
            j.schedule_removal()
    await update.message.reply_text("Напоминания отключены. Но лёгкий вес сам себя не поднимет 😉")


async def fallback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(random.choice(QUOTES), reply_markup=app_keyboard())


async def on_error(update: object, ctx: ContextTypes.DEFAULT_TYPE):
    log.error("Ошибка при обработке обновления", exc_info=ctx.error)


async def post_init(app: Application):
    await app.bot.set_my_commands([
        BotCommand("start", "Открыть приложение"),
        BotCommand("workout", "Начать тренировку"),
        BotCommand("motivation", "Мотивация"),
        BotCommand("remind", "Ежедневное напоминание, напр. /remind 18:30"),
        BotCommand("tz", "Часовой пояс, напр. /tz Europe/Moscow"),
        BotCommand("weekly", "Воскресная проверка: on или off"),
        BotCommand("stop", "Отключить напоминания"),
        BotCommand("help", "Помощь"),
    ])
    await app.bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="Тренировки", web_app=WebAppInfo(url=WEBAPP_URL))
    )
    for chat_id, cfg in load().items():
        try:
            schedule(app, int(chat_id), cfg)
        except Exception:
            log.exception("Не удалось восстановить напоминание для %s", chat_id)


def build() -> Application:
    app = Application.builder().token(TOKEN).post_init(post_init).build()
    for name, fn in (("start", start), ("workout", workout), ("motivation", motivation), ("remind", remind),
                     ("tz", tz_cmd), ("weekly", weekly), ("stop", stop), ("help", help_cmd)):
        app.add_handler(CommandHandler(name, fn))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, fallback))
    app.add_error_handler(on_error)
    return app


if __name__ == "__main__":
    if not TOKEN or not WEBAPP_URL.startswith("https://"):
        raise SystemExit("Задай BOT_TOKEN и WEBAPP_URL (адрес приложения, начинается с https://)")
    log.info("Бот запущен")
    build().run_polling(drop_pending_updates=True)
