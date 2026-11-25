import importlib
import os

import pytest

os.environ.setdefault("BOT_TOKEN", "123:abc")
os.environ.setdefault("WEBAPP_URL", "https://example.github.io/fitpath/")


@pytest.fixture()
def bot(tmp_path, monkeypatch):
    monkeypatch.setenv("REMINDERS_FILE", str(tmp_path / "rem.json"))
    import bot as b
    return importlib.reload(b)


def test_parse_hhmm(bot):
    assert bot.parse_hhmm("18:30") == (18, 30)
    assert bot.parse_hhmm(" 07:05 ") == (7, 5)
    for bad in ("24:00", "12:60", "abc", "", "7", "12:3:4", None):
        assert bot.parse_hhmm(bad) is None


def test_storage_roundtrip_and_migration(bot, tmp_path):
    assert bot.load() == {}
    bot.save({"1": {"time": "18:30", "tz": "Europe/Moscow"}})
    assert bot.load()["1"]["tz"] == "Europe/Moscow"
    # старый формат {chat: "HH:MM"} мигрирует
    (tmp_path / "rem.json").write_text('{"7": "09:00"}', encoding="utf-8")
    assert bot.load() == {"7": {"time": "09:00"}}


def test_corrupted_file_is_safe(bot, tmp_path):
    (tmp_path / "rem.json").write_text("{broken", encoding="utf-8")
    assert bot.load() == {}


def test_put_limit(bot, monkeypatch):
    monkeypatch.setattr(bot, "MAX_USERS", 1)
    bot._put(1, time="10:00")
    bot._put(1, tz="UTC")  # существующий пользователь обновляется
    with pytest.raises(RuntimeError):
        bot._put(2, time="10:00")


def test_get_tz_fallback(bot):
    assert str(bot.get_tz("Europe/Moscow")) == "Europe/Moscow"
    assert str(bot.get_tz("Not/AZone")) == "UTC"


def test_schedule_creates_jobs(bot):
    app = bot.build()
    bot.schedule(app, 5, {"time": "18:30", "tz": "Asia/Tashkent", "weekly": True})
    names = sorted(j.name for j in app.job_queue.jobs())
    assert names == ["r5", "w5"]
    bot.schedule(app, 5, {"time": "19:00"})  # перепланирование убирает weekly
    assert sorted(j.name for j in app.job_queue.jobs()) == ["r5"]
