# CodeSphere

Platform komunitas snippet berbasis Next.js + PostgreSQL.

## Fitur
- Registrasi, login, dan sesi cookie 30 hari
- Upload snippet publik atau dikunci password
- Like dan komentar
- Request langsung ke akun developer
- Profil, bio, dan foto profil melalui URL gambar
- Centang biru yang hanya dapat diberikan pemilik web
- Panel kendali pemilik di `/admin`
- Tabel database dibuat otomatis saat aplikasi pertama digunakan
- Docker standalone untuk Coolify

## Environment Coolify
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
DB_SSL=false
SESSION_SECRET=ganti-dengan-random-panjang
OWNER_EMAIL=email-pemilik@example.com
PORT=3000
HOSTNAME=0.0.0.0
```

Akun yang pertama mendaftar dengan alamat yang sama seperti `OWNER_EMAIL` otomatis menjadi `owner` dan mendapat centang biru.

## Deploy Coolify
- Build Pack: Dockerfile
- Dockerfile Location: `/Dockerfile`
- Port Exposes: `3000`
- Build Command: kosong
- Start Command: kosong

Lalu jalankan **Rebuild without cache**.
