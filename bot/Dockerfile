FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 REMINDERS_FILE=/data/reminders.json
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
 && useradd -m bot && mkdir -p /data && chown bot /data
COPY bot.py .
USER bot
VOLUME ["/data"]
CMD ["python", "bot.py"]
