// Хранилище пользователей: D1 в продакшене, память в тестах.
export class D1Store {
  constructor(db) { this.db = db; }
  async get(chat) { return (await this.db.prepare("SELECT * FROM users WHERE chat_id=?").bind(chat).first()) || null; }
  async count() { return (await this.db.prepare("SELECT COUNT(*) AS n FROM users").first()).n; }
  async put(chat, f) {
    const cur = (await this.get(chat)) || { chat_id: chat, time: null, tz: null, weekly: 0, last_sent: null, last_weekly: null };
    const u = { ...cur, ...f };
    await this.db.prepare(
      "INSERT INTO users (chat_id,time,tz,weekly,last_sent,last_weekly) VALUES (?,?,?,?,?,?) " +
      "ON CONFLICT(chat_id) DO UPDATE SET time=excluded.time,tz=excluded.tz,weekly=excluded.weekly,last_sent=excluded.last_sent,last_weekly=excluded.last_weekly")
      .bind(chat, u.time, u.tz, u.weekly ? 1 : 0, u.last_sent, u.last_weekly).run();
    return u;
  }
  async del(chat) { await this.db.prepare("DELETE FROM users WHERE chat_id=?").bind(chat).run(); }
  async scheduled() { return (await this.db.prepare("SELECT * FROM users WHERE time IS NOT NULL OR weekly=1").all()).results || []; }
}

export class MemStore {
  constructor() { this.m = new Map(); }
  async get(chat) { return this.m.get(chat) ? { ...this.m.get(chat) } : null; }
  async count() { return this.m.size; }
  async put(chat, f) {
    const cur = this.m.get(chat) || { chat_id: chat, time: null, tz: null, weekly: 0, last_sent: null, last_weekly: null };
    const u = { ...cur, ...f, weekly: (f.weekly ?? cur.weekly) ? 1 : 0 };
    this.m.set(chat, u); return { ...u };
  }
  async del(chat) { this.m.delete(chat); }
  async scheduled() { return [...this.m.values()].filter((u) => u.time || u.weekly); }
}
