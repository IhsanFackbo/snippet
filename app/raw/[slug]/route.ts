import { ensureSchema, getPool } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await ensureSchema();

    const pool = getPool();
    const { slug } = await context.params;

    const result = await pool.query(
      `
      SELECT code, language
      FROM snippets
      WHERE slug = $1
      LIMIT 1
      `,
      [slug]
    );

    if (result.rowCount === 0) {
      return new Response("Snippet tidak ditemukan", {
        status: 404,
      });
    }

    const snippet = result.rows[0];

    return new Response(snippet.code, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("raw_snippet_error", error);

    return new Response("Terjadi kesalahan pada server", {
      status: 500,
    });
  }
}
