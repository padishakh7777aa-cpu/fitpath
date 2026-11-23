"""LIGHTWEIGHT — Telegram-бот для мини-приложения с тренировками.

Запуск:
  BOT_TOKEN=... WEBAPP_URL=https://<user>.github.io/fitpath/ python bot.py

Команды: /start /workout /motivation /remind HH:MM /stop /help
Неофициальный проект в духе легенды бодибилдинга; не связан с Ронни Коулманом.
"""
import json
import logging
import os
import random
from datetime import time
from pathlib import Path
from zoneinfo import ZoneInfo

from telegram import (BotCommand, InlineKeyboardButton, InlineKeyboardMarkup,
                      MenuButtonWebApp, Update, WebAppInfo)
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("lightweight")

TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")
TZ = ZoneInfo(os.environ.get("TIMEZONE", "UTC"))
STORE = Path(os.environ.get("REMINDERS_FILE", "reminders.json"))

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
    "• 🏋️ программы для новичка, продвинутого и про\n"
    "• 🎬 техника упражнений в 3D\n"
    "• 🥗 питание под цель и готовое меню\n"
    "• 💊 спортпит: что реально работает\n"
    "• 📈 дневник тренировок и рекорды\n\n"
    "Жми кнопку и начинаем. <b>Light weight, baby!</b>"
)


def app_keyboard(text="🏋️ Открыть тренировки"):
    return InlineKeyboardMarkup([[InlineKeyboardButton(text, web_app=WebAppInfo(url=WEBAPP_URL))]])


def load():
    try:
        return json.loads(STORE.read_text())
    except Exception:
        return {}


def save(data):
    STORE.write_text(json.dumps(data))


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(WELCOME, reply_markup=app_keyboard())


async def workout(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Время тренироваться. Давай, чемпион! 🔥", reply_markup=app_keyboard("▶ Начать тренировку"))


async def motivation(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(random.choice(QUOTES))


async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(
        "<b>Команды</b>\n/start — открыть приложение\n/workout — начать тренировку\n"
        "/motivation — заряд мотивации\n/remind 18:30 — ежедневное напоминание\n/stop — отключить напоминание"
    )


async def remind_job(ctx: ContextTypes.DEFAULT_TYPE):
    await ctx.bot.send_message(
        ctx.job.chat_id,
        f"⏰ Пора в зал!\n{random.choice(QUOTES)}",
        reply_markup=app_keyboard("▶ Начать тренировку"),
    )


def schedule(app: Application, chat_id: int, hhmm: str):
    h, m = map(int, hhmm.split(":"))
    for j in app.job_queue.get_jobs_by_name(str(chat_id)):
        j.schedule_removal()
    app.job_queue.run_daily(remind_job, time(h, m, tzinfo=TZ), chat_id=chat_id, name=str(chat_id))


async def remind(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    arg = ctx.args[0] if ctx.args else ""
    try:
        h, m = map(int, arg.split(":"))
        assert 0 <= h < 24 and 0 <= m < 60
    except Exception:
        await update.message.reply_text("Формат: /remind 18:30")
        return
    hhmm = f"{h:02d}:{m:02d}"
    data = load()
    data[str(update.effective_chat.id)] = hhmm
    save(data)
    schedule(ctx.application, update.effective_chat.id, hhmm)
    await update.message.reply_text(f"Готово! Каждый день в {hhmm} напомню про тренировку. Yeah buddy! 💪")


async def stop(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    data = load()
    data.pop(str(update.effective_chat.id), None)
    save(data)
    for j in ctx.application.job_queue.get_jobs_by_name(str(update.effective_chat.id)):
        j.schedule_removal()
    await update.message.reply_text("Напоминание отключено. Но лёгкий вес сам себя не поднимет 😉")


async def fallback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(random.choice(QUOTES), reply_markup=app_keyboard())


async def post_init(app: Application):
    await app.bot.set_my_commands([
        BotCommand("start", "Открыть приложение"),
        BotCommand("workout", "Начать тренировку"),
        BotCommand("motivation", "Мотивация"),
        BotCommand("remind", "Ежедневное напоминание, напр. /remind 18:30"),
        BotCommand("stop", "Отключить напоминание"),
        BotCommand("help", "Помощь"),
    ])
    await app.bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="Тренировки", web_app=WebAppInfo(url=WEBAPP_URL))
    )
    for chat_id, hhmm in load().items():
        schedule(app, int(chat_id), hhmm)


def build() -> Application:
    app = Application.builder().token(TOKEN).post_init(post_init).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("workout", workout))
    app.add_handler(CommandHandler("motivation", motivation))
    app.add_handler(CommandHandler("remind", remind))
    app.add_handler(CommandHandler("stop", stop))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, fallback))
    return app


if __name__ == "__main__":
    if not TOKEN or not WEBAPP_URL:
        raise SystemExit("Задай переменные окружения BOT_TOKEN и WEBAPP_URL")
    build().run_polling(drop_pending_updates=True)
