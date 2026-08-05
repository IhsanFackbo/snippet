"use client";

import Link from "next/link";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = mode === "register";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Proses gagal");
      window.location.replace("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Proses gagal");
      setLoading(false);
    }
  }

  return <main className="authPage">
    <form className="authCard" onSubmit={submit}>
      <Link className="brand" href="/"><span className="brandMark">&lt;/&gt;</span><span>Share<span>Code</span></span></Link>
      <h1>{register ? "Buat akun" : "Selamat datang"}</h1>
      <p>{register ? "Daftar untuk mulai membagikan kode." : "Masuk untuk mengelola dan mengunggah snippet."}</p>
      {register && <label>Nama<input name="name" autoComplete="name" minLength={2} maxLength={80} required /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={8} required /></label>
      {error && <div className="authError">{error}</div>}
      <button className="primary large" disabled={loading}>{loading ? "Memproses…" : register ? "Buat akun" : "Masuk"}</button>
      <span className="authSwitch">{register ? "Sudah punya akun?" : "Belum punya akun?"} <Link href={register ? "/login" : "/register"}>{register ? "Masuk" : "Daftar"}</Link></span>
    </form>
  </main>;
}
