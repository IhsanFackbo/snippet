import { ensureSchema, query } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawSnippetRow = {
  code: string;
  visibility: string;
  access_password_hash: string | null;
};

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      slug: string;
    }>;
  },
) {
  try {
    await ensureSchema();

    const { slug } = await context.params;
    const cleanSlug = slug?.trim();

    if (!cleanSlug) {
      return new Response("Slug tidak valid", {
        status: 400,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    const result = await query<RawSnippetRow>(
      `
        UPDATE snippets
        SET views = views + 1
        WHERE slug = $1
          AND visibility = 'public'
          AND access_password_hash IS NULL
        RETURNING
          code,
          visibility,
          access_password_hash
      `,
      [cleanSlug],
    );

    const snippet = result.rows[0];

    if (!snippet) {
      return new Response(
        "Snippet tidak ditemukan, tidak publik, atau dikunci password.",
        {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return new Response(snippet.code, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("raw_snippet_error", error);

    return new Response("Terjadi kesalahan pada server", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
