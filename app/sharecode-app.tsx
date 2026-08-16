"use client";

import { useEffect, useMemo, useState } from "react";
import CodeBlock from "./code-block";

type User = { name: string; email: string } | null;
type Snippet = { id: number; slug: string; title: string; description: string; language: string; code: string; authorName: string; createdAt: string; views: number };

const fallback: Snippet[] = [
  { id: 1, slug: "express-api-starter", title: "Express API Starter", description: "REST API sederhana dengan error handler dan endpoint health check.", language: "JavaScript", authorName: "Nadia", createdAt: "Hari ini", views: 128, code: "import express from 'express'\n\nconst app = express()\napp.use(express.json())\n\napp.get('/health', (req, res) => {\n  res.json({ status: 'ok' })\n})\n\napp.listen(3000)" },
  { id: 2, slug: "mysql-pool-node", title: "MySQL Connection Pool", description: "Koneksi MySQL yang aman dan siap dipakai untuk Node.js.", language: "JavaScript", authorName: "Raka", createdAt: "Kemarin", views: 86, code: "import mysql from 'mysql2/promise'\n\nexport const db = mysql.createPool({\n  host: process.env.DB_HOST,\n  user: process.env.DB_USER,\n  password: process.env.DB_PASSWORD,\n  database: process.env.DB_NAME\n})" },
  { id: 3, slug: "login-query", title: "Query Login Aman", description: "Contoh prepared statement untuk mencari akun berdasarkan email.", language: "SQL", authorName: "Alya", createdAt: "2 hari lalu", views: 242, code: "SELECT id, name, email, password_hash\nFROM users\nWHERE email = ?\nLIMIT 1;" }
];

export default function ShareCodeApp({ user }: { user: User }) {
  const [snippets, setSnippets] = useState<Snippet[]>(fallback);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("Semua");
  const [active, setActive] = useState<Snippet | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/snippets").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.snippets?.length) setSnippets(data.snippets);
    }).catch(() => null);
  }, []);

  const filtered = useMemo(() => snippets.filter(item => {
    const text = `${item.title} ${item.description} ${item.authorName}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (language === "Semua" || item.language === language);
  }), [snippets, query, language]);

  async function copy(code: string) {
    await navigator.clipboard.writeText(code);
    setToast("Kode berhasil disalin");
    setTimeout(() => setToast(""), 1800);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/snippets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (response.status === 401) { window.location.href = "/login"; return; }
    const data = await response.json();
    if (!response.ok) { setToast(data.error || "Gagal mengunggah"); return; }
    setSnippets(current => [data.snippet, ...current]);
    setUploading(false);
    setToast("Snippet berhasil dipublikasikan");
  }

  return <main>
    <header className="topbar">
      <a className="brand" href="#"><span className="brandMark">&lt;/&gt;</span><span>Share<span>Code</span></span></a>
      <nav><a href="#jelajah">Jelajah</a><a href="#cara">Cara kerja</a><a href="#donasi">Donasi</a></nav>
      <div className="account">
        {user ? <><span className="userPill">{user.name.charAt(0).toUpperCase()} <b>{user.name.split(" ")[0]}</b></span><button className="ghost small" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.reload(); }}>Keluar</button></> : <a className="ghost" href="/login">Masuk / Buat akun</a>}
        <button className="primary" onClick={() => user ? setUploading(true) : window.location.href = "/login"}>+ Upload kode</button>
      </div>
    </header>

    <section className="hero">
      <div className="heroCopy">
        <div className="eyebrow"><span></span> SIMPAN · BAGIKAN · BANGUN</div>
        <h1>Kode bagus layak<br/><em>dibagikan.</em></h1>
        <p>Tempat paling sederhana untuk menyimpan snippet, membagikan raw code, dan menemukan solusi dari developer lain.</p>
        <div className="heroActions"><button className="primary large" onClick={() => user ? setUploading(true) : window.location.href = "/login"}>Bagikan kode kamu →</button><a className="textLink" href="#jelajah">Jelajahi snippet ↓</a></div>
        <div className="trust"><span>✓ Gratis untuk digunakan</span><span>✓ Raw link instan</span><span>✓ Sesi aman</span></div>
      </div>
      <div className="codeWindow">
        <div className="windowBar"><div><i></i><i></i><i></i></div><span>api/auth.js</span><button onClick={() => copy(fallback[0].code)}>Salin</button></div>
        <pre><code><b>01</b> <span className="purple">import</span> express <span className="purple">from</span> <span className="green">&apos;express&apos;</span>{"\n"}<b>02</b>{"\n"}<b>03</b> <span className="purple">const</span> app = <span className="blue">express</span>(){"\n"}<b>04</b> app.<span className="blue">use</span>(express.<span className="blue">json</span>()){"\n"}<b>05</b>{"\n"}<b>06</b> app.<span className="blue">post</span>(<span className="green">&apos;/api/login&apos;</span>, <span className="purple">async</span> (req, res) =&gt; {'{'}{"\n"}<b>07</b>   <span className="purple">const</span> {'{'} email, password {'}'} = req.body{"\n"}<b>08</b>   <span className="purple">const</span> user = <span className="purple">await</span> db.<span className="blue">findUser</span>(email){"\n"}<b>09</b>{"\n"}<b>10</b>   <span className="purple">if</span> (!user) {'{'}{"\n"}<b>11</b>     <span className="purple">return</span> res.<span className="blue">status</span>(401).<span className="blue">json</span>({'{'} error: <span className="green">&apos;Invalid&apos;</span> {'}'}){"\n"}<b>12</b>   {'}'}{"\n"}<b>13</b> {'}'})</code></pre>
        <div className="windowFoot"><span><i></i> Public</span><span>JavaScript · 1.2 KB</span></div>
      </div>
    </section>

    <section className="explore" id="jelajah">
      <div className="sectionHead"><div><span className="kicker">SNIPPET TERBARU</span><h2>Temukan sesuatu yang berguna.</h2></div><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari kode, judul, atau kreator..."/></div></div>
      <div className="filters">{["Semua","JavaScript","TypeScript","Python","PHP","SQL","CSS"].map(item => <button key={item} className={language === item ? "active" : ""} onClick={() => setLanguage(item)}>{item}</button>)}</div>
      <div className="grid">{filtered.map(item => <article className="card" key={item.id} onClick={() => setActive(item)}>
        <div className="cardTop"><span className={`lang ${item.language.toLowerCase()}`}>{item.language}</span><span>•••</span></div>
        <h3>{item.title}</h3><p>{item.description}</p><CodeBlock code={item.code.slice(0, 180) + (item.code.length > 180 ? "…" : "")} language={item.language} />
        <div className="cardFoot"><span className="avatar">{item.authorName.charAt(0)}</span><span>{item.authorName}</span><span className="grow">◉ {item.views}</span><button onClick={e => {e.stopPropagation(); copy(item.code)}}>Salin raw</button></div>
      </article>)}</div>
    </section>

    <section className="how" id="cara"><span className="kicker">CARA KERJA</span><h2>Dari editor ke publik dalam hitungan detik.</h2><div className="steps"><div><b>01</b><h3>Masuk dengan aman</h3><p>Sesi akun kamu diingat tanpa menyimpan password mentah.</p></div><div><b>02</b><h3>Tempel kode</h3><p>Beri judul, pilih bahasa, lalu publikasikan snippet.</p></div><div><b>03</b><h3>Bagikan raw</h3><p>Salin kode atau tautan raw langsung dari halaman publik.</p></div></div></section>

    <section className="donate" id="donasi"><div><span className="kicker">DUKUNG PROYEK</span><h2>Suka dengan ShareCode?</h2><p>Bantu biaya server dan pengembangan fitur baru. Dukungan sekecil apa pun sangat berarti.</p></div><div className="donateBtns"><a href="https://saweria.co/" target="_blank" rel="noreferrer">☕ Donasi via Saweria</a><a href="https://trakteer.id/" target="_blank" rel="noreferrer">❤ Trakteer</a></div></section>
    <footer><a className="brand" href="#"><span className="brandMark">&lt;/&gt;</span><span>Share<span>Code</span></span></a><p>Dibuat untuk developer yang suka berbagi.</p><span>© 2026 ShareCode</span></footer>

    {uploading && <div className="overlay" onMouseDown={() => setUploading(false)}><form className="modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setUploading(false)}>×</button><span className="kicker">SNIPPET BARU</span><h2>Bagikan kode kamu</h2><label>Judul<input name="title" required maxLength={80} placeholder="Contoh: Express API Starter"/></label><label>Deskripsi<input name="description" maxLength={180} placeholder="Jelaskan kegunaan snippet..."/></label><label>Bahasa<select name="language" defaultValue="JavaScript">{["JavaScript","TypeScript","Python","PHP","SQL","CSS","HTML","Lainnya"].map(x => <option key={x}>{x}</option>)}</select></label><label>Kode<textarea name="code" required rows={12} spellCheck={false} placeholder="Tempel kode di sini..."/></label><button className="primary large" type="submit">Publikasikan snippet →</button></form></div>}
    {active && <div className="overlay" onMouseDown={() => setActive(null)}><div className="modal detail" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setActive(null)}>×</button><span className={`lang ${active.language.toLowerCase()}`}>{active.language}</span><h2>{active.title}</h2><p>{active.description}</p><CodeBlock code={active.code} language={active.language} /><div className="detailActions"><button className="primary" onClick={() => copy(active.code)}>Salin raw</button><a className="ghost" href={`/raw/${active.slug}`} target="_blank">Buka raw ↗</a></div></div></div>}
    {toast && <div className="toast">✓ {toast}</div>}
  </main>;
}
