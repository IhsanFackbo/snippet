"use client";

import { use, useCallback, useEffect, useState } from "react";
import CodeBlock from "@/app/code-block";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Lainnya");
  const [locked, setLocked] = useState<boolean | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [commentSent, setCommentSent] = useState(false);

  const loadComments = useCallback(() => fetch(`/api/snippets/${id}/comments`)
    .then((response) => response.json()).then(setComments), [id]);

  useEffect(() => {
    loadComments();
    fetch(`/api/snippets/${id}/unlock`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal membuka snippet");
        setLocked(Boolean(data.locked));
        setLanguage(data.language || "Lainnya");
        if (!data.locked) setCode(data.code || "");
      })
      .catch((err) => setError(err.message));
  }, [id, loadComments]);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch(`/api/snippets/${id}/unlock`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (response.ok) {
      setCode(data.code); setLanguage(data.language || "Lainnya"); setLocked(false);
    } else setError(data.error);
  }

  async function comment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const content = new FormData(form).get("content");
    const response = await fetch(`/api/snippets/${id}/comments`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) { alert((await response.json()).error); return; }
    form.reset();
    await loadComments();
    setCommentSent(true);
    window.setTimeout(() => setCommentSent(false), 2400);
  }

  return <main>
    <header><a href="/" className="brand">&lt;/&gt; CodeSphere</a></header>
    <section className="detail">
      <a href="/">← Kembali</a><h1>Kode snippet</h1>
      {locked === null && !error && <div className="codeLoading">Memuat kode…</div>}
      {locked && <form className="unlock" onSubmit={unlock}>
        <p>Snippet ini dilindungi password.</p>
        <input name="password" type="password" placeholder="Masukkan password akses" required />
        <button>Buka kode</button><span className="error">{error}</span>
      </form>}
      {!locked && code && <div className="codeViewer">
        <div className="codeViewerHead"><span>{language}</span><button onClick={() => navigator.clipboard.writeText(code)}>Salin kode</button></div>
        <CodeBlock code={code} language={language} />
      </div>}
      {error && locked !== true && <p className="error">{error}</p>}
      <div className="comments"><h2>Komentar</h2>
        {comments.map((item) => <div className="comment" key={item.id}>
          <img src={item.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${item.username}`} alt="" />
          <p><strong>{item.name} {item.verified && <span className="check">✓</span>}</strong><br />{item.content}</p>
        </div>)}
        <form onSubmit={comment}><textarea name="content" placeholder="Tulis komentar..." required /><button>Kirim komentar</button></form>
      </div>
    </section>
    {commentSent && <div className="successToast"><span>✓</span><div><strong>Komentar terkirim!</strong><small>Komentarmu berhasil dipublikasikan.</small></div></div>}
  </main>;
}
