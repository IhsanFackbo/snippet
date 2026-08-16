import { Pool, type QueryResult, type QueryResultRow } from "pg";

declare global {
  var shareCodePool: Pool | undefined;
  var shareCodeSchemaReady: Promise<void> | undefined;
}

/**
 * Membuat koneksi PostgreSQL hanya saat dibutuhkan.
 * Aman untuk proses next build karena DATABASE_URL
 * tidak langsung dibaca ketika file di-import.
 */
export function getPool(): Pool {
  if (global.shareCodePool) {
    return global.shareCodePool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur");
  }

  const useSsl = process.env.DB_SSL === "true";

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: useSsl
      ? {
          rejectUnauthorized: false,
        }
      : false,
  });

  pool.on("error", (error) => {
    console.error("postgres_pool_error", error);
  });

  global.shareCodePool = pool;

  return pool;
}

/**
 * Kompatibilitas untuk file lama yang menggunakan:
 * db().query(...)
 */
export function db(): Pool {
  return getPool();
}

/**
 * Helper query PostgreSQL.
 */
export async function query<
  T extends QueryResultRow = QueryResultRow,
>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, values);
}

/**
 * Membuat serta memperbarui struktur database.
 */
export async function ensureSchema(): Promise<void> {
  if (global.shareCodeSchemaReady) {
    return global.shareCodeSchemaReady;
  }

  global.shareCodeSchemaReady = (async () => {
    const pool = getPool();

    /*
     * Tabel utama.
     */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash CHAR(64) PRIMARY KEY,
        user_id BIGINT NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS snippets (
        id BIGSERIAL PRIMARY KEY,
        slug VARCHAR(90) NOT NULL UNIQUE,
        user_id BIGINT NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,
        title VARCHAR(120) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        language VARCHAR(40) NOT NULL DEFAULT 'Lainnya',
        code TEXT NOT NULL,
        visibility VARCHAR(20) NOT NULL DEFAULT 'public',
        access_password_hash TEXT,
        views INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS likes (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,
        snippet_id BIGINT NOT NULL
          REFERENCES snippets(id)
          ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, snippet_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,
        snippet_id BIGINT NOT NULL
          REFERENCES snippets(id)
          ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS developer_requests (
        id BIGSERIAL PRIMARY KEY,
        sender_id BIGINT NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,
        developer_id BIGINT NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,
        snippet_id BIGINT
          REFERENCES snippets(id)
          ON DELETE SET NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /*
     * Migrasi untuk database lama.
     */
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS name VARCHAR(80);

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS username VARCHAR(50);

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS updated_at
        TIMESTAMPTZ NOT NULL DEFAULT NOW();

      ALTER TABLE snippets
        ADD COLUMN IF NOT EXISTS slug VARCHAR(90);

      ALTER TABLE snippets
        ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

      ALTER TABLE snippets
        ADD COLUMN IF NOT EXISTS language VARCHAR(40)
        NOT NULL DEFAULT 'Lainnya';

      ALTER TABLE snippets
        ADD COLUMN IF NOT EXISTS visibility VARCHAR(20)
        NOT NULL DEFAULT 'public';

      ALTER TABLE snippets
        ADD COLUMN IF NOT EXISTS access_password_hash TEXT;

      ALTER TABLE snippets
        ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;

      ALTER TABLE snippets
        ADD COLUMN IF NOT EXISTS updated_at
        TIMESTAMPTZ NOT NULL DEFAULT NOW();

      ALTER TABLE comments
        ADD COLUMN IF NOT EXISTS updated_at
        TIMESTAMPTZ NOT NULL DEFAULT NOW();

      ALTER TABLE developer_requests
        ADD COLUMN IF NOT EXISTS snippet_id BIGINT;

      ALTER TABLE developer_requests
        ADD COLUMN IF NOT EXISTS status VARCHAR(20)
        NOT NULL DEFAULT 'pending';

      ALTER TABLE developer_requests
        ADD COLUMN IF NOT EXISTS updated_at
        TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    /*
     * Memindahkan password snippet lama dari password_hash
     * ke access_password_hash apabila kolom lama tersedia.
     */
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'snippets'
            AND column_name = 'password_hash'
        ) THEN
          UPDATE snippets
          SET access_password_hash = password_hash
          WHERE access_password_hash IS NULL
            AND password_hash IS NOT NULL;
        END IF;
      END
      $$;
    `);

    /*
     * Mengisi data lama yang masih kosong.
     */
    await pool.query(`
      UPDATE users
      SET name = COALESCE(NULLIF(name, ''), 'User ' || id)
      WHERE name IS NULL OR name = '';

      UPDATE users
      SET username = 'user_' || id
      WHERE username IS NULL OR username = '';

      UPDATE snippets
      SET slug = 'snippet-' || id
      WHERE slug IS NULL OR slug = '';

      UPDATE snippets
      SET visibility = 'public'
      WHERE visibility IS NULL OR visibility = '';
    `);

    /*
     * Index.
     */
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
        ON users(username)
        WHERE username IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS snippets_slug_unique_idx
        ON snippets(slug)
        WHERE slug IS NOT NULL;

      CREATE INDEX IF NOT EXISTS sessions_user_id_idx
        ON sessions(user_id);

      CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
        ON sessions(expires_at);

      CREATE INDEX IF NOT EXISTS snippets_user_id_idx
        ON snippets(user_id);

      CREATE INDEX IF NOT EXISTS snippets_created_at_idx
        ON snippets(created_at DESC);

      CREATE INDEX IF NOT EXISTS likes_snippet_id_idx
        ON likes(snippet_id);

      CREATE INDEX IF NOT EXISTS comments_snippet_id_idx
        ON comments(snippet_id);

      CREATE INDEX IF NOT EXISTS developer_requests_sender_id_idx
        ON developer_requests(sender_id);

      CREATE INDEX IF NOT EXISTS developer_requests_developer_id_idx
        ON developer_requests(developer_id);

      CREATE INDEX IF NOT EXISTS developer_requests_status_idx
        ON developer_requests(status);
    `);
  })().catch((error) => {
    global.shareCodeSchemaReady = undefined;
    throw error;
  });

  return global.shareCodeSchemaReady;
}
