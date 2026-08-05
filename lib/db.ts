import { Pool } from "pg";
let pool: Pool | null = null;
let ready: Promise<void> | null = null;
export function db() {
  if (!pool) {
    const cs = process.env.DATABASE_URL;
    if (!cs) throw new Error("DATABASE_URL belum diatur");
    const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;
    pool = new Pool({ connectionString: cs, ssl, max: 10 });
  }
  return pool;
}
export async function ensureSchema() {
  if (!ready) ready = (async () => {
    const p = db();
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY, name VARCHAR(80) NOT NULL, username VARCHAR(40) UNIQUE NOT NULL,
        email VARCHAR(160) UNIQUE NOT NULL, password_hash TEXT NOT NULL, bio VARCHAR(280) DEFAULT '',
        avatar_url TEXT DEFAULT '', verified BOOLEAN DEFAULT FALSE, role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS snippets (
        id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(160) NOT NULL, description TEXT DEFAULT '', language VARCHAR(40) DEFAULT 'text',
        code TEXT NOT NULL, access_password_hash TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS likes (
        user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        snippet_id BIGINT REFERENCES snippets(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(user_id, snippet_id)
      );
      CREATE TABLE IF NOT EXISTS comments (
        id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        snippet_id BIGINT REFERENCES snippets(id) ON DELETE CASCADE,
        content VARCHAR(1000) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS developer_requests (
        id BIGSERIAL PRIMARY KEY, requester_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        developer_id BIGINT REFERENCES users(id) ON DELETE CASCADE, message VARCHAR(1000) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  })();
  return ready;
}
