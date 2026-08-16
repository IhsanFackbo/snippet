import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

async function findSnippet(id: string) {
  return db().query(
    "SELECT code,language,access_password_hash FROM snippets WHERE id=$1",
    [id],
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const result = await findSnippet(id);
  if (!result.rowCount) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const row = result.rows[0];
  if (row.access_password_hash) {
    return NextResponse.json({ locked: true, language: row.language });
  }
  return NextResponse.json({ locked: false, code: row.code, language: row.language });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const { password } = await req.json();
  const result = await findSnippet(id);
  if (!result.rowCount) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const row = result.rows[0];
  if (row.access_password_hash && !(await bcrypt.compare(password || "", row.access_password_hash))) {
    return NextResponse.json({ error: "Password salah" }, { status: 403 });
  }
  return NextResponse.json({ locked: false, code: row.code, language: row.language });
}
