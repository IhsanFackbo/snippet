import { Pool, type QueryResultRow } from "pg"

const globalDatabase = globalThis as typeof globalThis & { shareCodePool?: Pool; shareCodeReady?: Promise<void> }

function getPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL belum diatur")
  if (!globalDatabase.shareCodePool) {
    globalDatabase.shareCodePool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
    })
  }
  return globalDatabase.shareCodePool
}

export function initializeDatabase() {
  if (!globalDatabase.shareCodeReady) {
    globalDatabase.shareCodeReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS snippets (
        id BIGSERIAL PRIMARY KEY,
        slug VARCHAR(90) NOT NULL UNIQUE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(80) NOT NULL,
        description VARCHAR(180) NOT NULL DEFAULT '',
        language VARCHAR(30) NOT NULL,
        code TEXT NOT NULL,
        visibility VARCHAR(20) NOT NULL DEFAULT 'public',
        views INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS snippets_created_at_idx ON snippets(created_at DESC);
    `).then(() => undefined)
  }
  return globalDatabase.shareCodeReady
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  await initializeDatabase()
  return getPool().query<T>(text, values)
}
