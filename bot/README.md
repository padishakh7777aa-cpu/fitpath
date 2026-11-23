# Бот LIGHTWEIGHT

1. Токен: @BotFather → `/newbot` (или возьми токен существующего бота: `/mybots` → API Token).
2. Запуск локально или на сервере:
   ```
   pip install -r requirements.txt
   export BOT_TOKEN=... WEBAPP_URL=https://padishakh7777aa-cpu.github.io/fitpath/ TIMEZONE=Europe/Moscow
   python bot.py
   ```
3. Хостинг 24/7: Railway / Render / Fly.io / любой VPS. Используй Dockerfile, переменные окружения те же.

Бот сам задаёт команды и кнопку меню «Тренировки», которая открывает мини-приложение.
