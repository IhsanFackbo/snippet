import { ensureSchema, pool } from "../../../lib/db";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  await ensureSchema();
  const { slug } = await context.params;
  const result = await pool.query<{ code: string }>(`
    UPDATE snippets SET views = views + 1
    WHERE slug = $1 AND visibility = 'public'
    RETURNING code
  `, [slug]);
  if (!result.rows[0]) return new Response("Snippet tidak ditemukan", { status: 404 });
  return new Response(result.rows[0].code, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=60" }
  });
}
