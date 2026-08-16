import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function sendRequestEmail(args: {
  recipient: string; recipientName: string; senderUsername: string;
  message: string; snippetTitle?: string; snippetId?: number; origin: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) return false;
  const baseUrl = process.env.APP_URL || args.origin;
  const link = args.snippetId ? `${baseUrl}/snippet/${args.snippetId}` : baseUrl;
  const subject = args.snippetTitle
    ? `Request baru untuk snippet: ${args.snippetTitle}`
    : "Request developer baru di CodeSphere";
  const text = [
    `Halo ${args.recipientName},`, "",
    `@${args.senderUsername} mengirim request melalui CodeSphere.`,
    args.snippetTitle ? `Snippet: ${args.snippetTitle}` : "", "", "Pesan:",
    args.message, "", `Buka: ${link}`,
  ].filter(Boolean).join("\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [args.recipient], subject, text }),
  });
  if (!response.ok) console.error("request_email_error", response.status, await response.text());
  return response.ok;
}

export async function POST(req: Request) {
  await ensureSchema();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
  try {
    const { developer_id, snippet_id, message } = await req.json();
    const cleanMessage = String(message || "").trim().slice(0, 1000);
    if (!developer_id || !cleanMessage) {
      return NextResponse.json({ error: "Pesan request wajib diisi" }, { status: 400 });
    }
    const recipientResult = await db().query(
      `SELECT u.email,u.name,s.title FROM users u
       LEFT JOIN snippets s ON s.id=$2 AND s.user_id=u.id WHERE u.id=$1`,
      [developer_id, snippet_id || null],
    );
    if (!recipientResult.rowCount) {
      return NextResponse.json({ error: "Developer tidak ditemukan" }, { status: 404 });
    }
    await db().query(
      `INSERT INTO developer_requests(sender_id,developer_id,snippet_id,message)
       VALUES($1,$2,$3,$4)`,
      [session.id, developer_id, snippet_id || null, cleanMessage],
    );
    const recipient = recipientResult.rows[0];
    let emailSent = false;
    try {
      emailSent = await sendRequestEmail({
        recipient: recipient.email, recipientName: recipient.name,
        senderUsername: session.username, message: cleanMessage,
        snippetTitle: recipient.title,
        snippetId: snippet_id ? Number(snippet_id) : undefined,
        origin: new URL(req.url).origin,
      });
    } catch (error) { console.error("request_email_exception", error); }
    return NextResponse.json({ ok: true, emailSent });
  } catch (error) {
    console.error("create_request_error", error);
    return NextResponse.json({ error: "Gagal mengirim request" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureSchema();
    const session = await getSession();
    if (!session) return NextResponse.json([]);
    const result = await db().query(
      `SELECT dr.*,u.name,u.username,s.title AS snippet_title
       FROM developer_requests dr JOIN users u ON u.id=dr.sender_id
       LEFT JOIN snippets s ON s.id=dr.snippet_id
       WHERE dr.developer_id=$1 ORDER BY dr.created_at DESC`,
      [session.id],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("list_requests_error", error);
    return NextResponse.json([]);
  }
}
