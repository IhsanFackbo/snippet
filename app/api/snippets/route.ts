import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await ensureSchema();
  const session = await getSession();
  const result = await db().query(
    `SELECT s.id,s.title,s.description,s.language,s.created_at,
      s.access_password_hash IS NOT NULL AS locked,
      u.id user_id,u.name,u.username,u.avatar_url,u.verified,
      COUNT(DISTINCT l.user_id)::int likes,
      COUNT(DISTINCT c.id)::int comments,
      BOOL_OR(l.user_id=$1) liked
    FROM snippets s
    JOIN users u ON u.id=s.user_id
    LEFT JOIN likes l ON l.snippet_id=s.id
    LEFT JOIN comments c ON c.snippet_id=s.id
    GROUP BY s.id,u.id
    ORDER BY s.created_at DESC`,
    [session?.id || 0],
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: Request) {
  await ensureSchema();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
  }

  try {
    const { title, description, language, code, password } = await req.json();
    if (!title || !code) {
      return NextResponse.json({ error: "Judul dan kode wajib" }, { status: 400 });
    }

    const baseSlug = String(title).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "snippet";
    const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const result = await db().query(
      `INSERT INTO snippets
        (slug,user_id,title,description,language,code,access_password_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,slug`,
      [slug,session.id,String(title).slice(0,120),String(description||""),
       String(language||"Lainnya").slice(0,40),String(code),passwordHash],
    );
    return NextResponse.json({ ok: true, ...result.rows[0] });
  } catch (error) {
    console.error("create_snippet_error", error);
    return NextResponse.json({ error: "Gagal memublikasikan snippet" }, { status: 500 });
  }
}
