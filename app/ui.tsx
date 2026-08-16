"use client";

import { useEffect, useState } from "react";

type User = { id:number; name:string; username:string; avatar_url:string; verified:boolean; role:string };
type Snip = { id:number; title:string; description:string; language:string; locked:boolean; user_id:number; name:string; username:string; avatar_url:string; verified:boolean; likes:number; comments:number; liked:boolean };

const api = async (url:string, options?:RequestInit) => {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data;
};

export default function App() {
  const [user, setUser] = useState<User|null>(null);
  const [items, setItems] = useState<Snip[]>([]);
  const [modal, setModal] = useState<string|null>(null);
  const [message, setMessage] = useState("");
  const [requestTarget, setRequestTarget] = useState<Snip|null>(null);

  const load = () => Promise.all([
    api("/api/me").then((data) => setUser(data.user)),
    api("/api/snippets").then(setItems),
  ]);
  useEffect(() => { load(); }, []);

  async function auth(event: React.FormEvent<HTMLFormElement>, type:string) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/auth/${type}`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(Object.fromEntries(form)) });
      setModal(null); await load();
    } catch (error) { setMessage((error as Error).message); }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/snippets", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(Object.fromEntries(form)) });
      setModal(null); await load();
    } catch (error) { setMessage((error as Error).message); }
  }

  async function sendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestTarget) return;
    setMessage("");
    const text = String(new FormData(event.currentTarget).get("message") || "");
    try {
      const result = await api("/api/requests", {
        method:"POST", headers:{"content-type":"application/json"},
        body:JSON.stringify({ developer_id:requestTarget.user_id, snippet_id:requestTarget.id, message:text }),
      });
      setMessage(result.emailSent
        ? "Request tersimpan dan email berhasil dikirim."
        : "Request tersimpan. Email belum dikirim karena konfigurasi email belum aktif.");
      (event.currentTarget as HTMLFormElement).reset();
    } catch (error) { setMessage((error as Error).message); }
  }

  function openRequest(item:Snip) {
    setRequestTarget(item); setMessage(""); setModal("request");
  }

  return <main>
    <header><a className="brand">&lt;/&gt; CodeSphere</a><nav><a href="#feed">Jelajah</a>{user&&<a href="/profile">Profil</a>}{user?.role==="owner"&&<a href="/admin">Kendali</a>}</nav>
      <div className="actions">{user?<><button className="ghost" onClick={async()=>{await api("/api/auth/logout",{method:"POST"});location.reload();}}>Keluar</button><button onClick={()=>{setMessage("");setModal("create");}}>+ Upload code</button></>:<><button className="ghost" onClick={()=>{setMessage("");setModal("login");}}>Masuk</button><button onClick={()=>{setMessage("");setModal("register");}}>Daftar</button></>}</div>
    </header>
    <section className="hero"><div><span className="pill">Platform developer Indonesia</span><h1>Bagikan kode.<br/><em>Bangun reputasi.</em></h1><p>Publikasikan snippet, diskusikan solusi, dan kirim request langsung ke developer yang tepat.</p><button onClick={()=>setModal(user?"create":"register")}>Mulai berbagi kode</button></div><div className="codecard"><div className="dots">● ● ●</div><pre><b>const</b> community = {"{"}<br/>  creators: <i>true</i>,<br/>  collaboration: <i>true</i>,<br/>  control: <span>&quot;yours&quot;</span><br/>{"}"};</pre></div></section>
    <section id="feed" className="content"><div className="sectionhead"><div><small>COMMUNITY FEED</small><h2>Snippet terbaru</h2></div><input placeholder="Cari judul atau bahasa..." onChange={(event)=>{const query=event.target.value.toLowerCase();document.querySelectorAll(".snippet").forEach((element)=>{(element as HTMLElement).style.display=(element.textContent||"").toLowerCase().includes(query)?"":"none";});}}/></div>
      <div className="grid">{items.map((item)=><article className="snippet" key={item.id}><div className="author"><img src={item.avatar_url||`https://api.dicebear.com/9.x/initials/svg?seed=${item.username}`} alt=""/><div><strong>{item.name} {item.verified&&<span className="check">✓</span>}</strong><small>@{item.username}</small></div><span className="lang">{item.language}</span></div><h3>{item.locked&&"🔒 "}{item.title}</h3><p>{item.description||"Tanpa deskripsi."}</p><div className="meta"><button onClick={async()=>{try{await api(`/api/snippets/${item.id}/like`,{method:"POST"});load();}catch(error){alert((error as Error).message);}}}>♥ {item.likes}</button><span><a href={`/snippet/${item.id}`}>💬 {item.comments} · Lihat kode</a>{user&&user.id!==item.user_id&&<button className="requestbtn" onClick={()=>openRequest(item)}>Request</button>}</span></div></article>)}</div>
    </section>
    <footer>CodeSphere · Kendali tetap di tangan pemilik platform.</footer>
    {modal&&<div className="overlay" onMouseDown={(event)=>{if(event.target===event.currentTarget)setModal(null);}}><div className="modal"><button className="x" onClick={()=>setModal(null)}>×</button>
      {modal==="login"&&<><h2>Selamat datang kembali</h2><form onSubmit={(event)=>auth(event,"login")}><input name="identity" placeholder="Email atau username" required/><input name="password" type="password" placeholder="Password" required/><button>Masuk</button></form></>}
      {modal==="register"&&<><h2>Buat akun baru</h2><form onSubmit={(event)=>auth(event,"register")}><input name="name" placeholder="Nama lengkap" required/><input name="username" placeholder="Username" required/><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" placeholder="Password minimal 6 karakter" required/><button>Daftar</button></form></>}
      {modal==="create"&&<><h2>Upload snippet</h2><form onSubmit={create}><input name="title" placeholder="Judul snippet" required/><div className="row"><input name="language" placeholder="Bahasa: JavaScript"/><input name="password" type="password" placeholder="Password akses (opsional)"/></div><textarea name="description" placeholder="Deskripsi singkat"/><textarea name="code" className="codeinput" placeholder="Tempel kode di sini..." required/><button>Publikasikan</button></form></>}
      {modal==="request"&&requestTarget&&<><h2>Kirim request</h2><p className="requestInfo">Kepada <b>@{requestTarget.username}</b> untuk kode <b>{requestTarget.title}</b>.</p><form onSubmit={sendRequest}><textarea name="message" placeholder="Jelaskan kebutuhan atau kerja sama yang kamu inginkan..." required maxLength={1000}/><button>Kirim request</button></form></>}
      {message&&<p className={message.startsWith("Request tersimpan")?"requestSuccess":"error"}>{message}</p>}
    </div></div>}
  </main>;
}
