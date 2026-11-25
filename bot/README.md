# Бот LIGHTWEIGHT

Открывает мини-приложение кнопкой, присылает напоминания о тренировках и мотивацию.

## Команды
`/start`, `/workout`, `/motivation`, `/remind 18:30`, `/tz Europe/Moscow`, `/weekly on|off`, `/stop`, `/help`.
У каждого пользователя свой часовой пояс и своё время напоминания.

## Запуск за 5 минут
1. В @BotFather: `/newbot` → получи токен (для существующего бота: `/mybots` → API Token).
2. Адрес приложения: например `https://<логин>.github.io/fitpath/` (должен начинаться с `https://`).
3. Локально:
   ```
   pip install -r requirements.txt
   BOT_TOKEN=... WEBAPP_URL=https://... TIMEZONE=Europe/Moscow python bot.py
   ```
4. Хостинг 24/7:
   - **Render:** New → Blueprint, выбери репозиторий (файл `render.yaml`), задай `BOT_TOKEN` и `WEBAPP_URL`. Диск нужен, чтобы напоминания не пропадали при перезапуске.
   - **Railway / Fly.io / VPS:** используй `Dockerfile` (или `Procfile`), те же переменные, том для `/data`.

## Переменные окружения
| Переменная | Назначение |
|---|---|
| `BOT_TOKEN` | токен от BotFather |
| `WEBAPP_URL` | адрес мини-приложения (https) |
| `TIMEZONE` | пояс по умолчанию (по умолчанию UTC) |
| `REMINDERS_FILE` | путь к файлу напоминаний |
| `MAX_USERS` | лимит пользователей с напоминаниями (по умолчанию 5000) |

## Тесты
`pip install -r requirements-dev.txt && python -m pytest -q test_bot.py`

Бот не хранит данные тренировок: они остаются в приложении и в облаке Telegram пользователя.
