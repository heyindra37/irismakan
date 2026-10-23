# Rak Buku Cerita Iris 📚

Satu repo, banyak buku cerita interaktif. Halaman utama (`index.html`) adalah **rak buku**; tiap buku ada di `books/<nama-buku>/`.

```
index.html                 ← rak buku (daftar BOOKS)
books/istana-mulut/        ← buku 1: Istana Mulut Putri Iris
  index.html style.css app.js sw.js manifest.webmanifest assets/
```

## Menambah buku baru
1. Salin folder: `cp -r books/istana-mulut books/nama-buku-baru`
2. Di folder baru: ganti gambar di `assets/` (`hero.webp`, `palace.webp`, ikon), isi cerita (`PAGES`, dst.) di `app.js`, judul/nama di `index.html` dan `manifest.webmanifest`.
3. Di `sw.js` ubah `VERSION` ke nama unik (mis. `nama-buku-baru-v1`) dan sesuaikan daftar `SHELL` bila nama file gambar berubah.
4. Di `app.js` ubah awalan penyimpanan `'iris.'` bila ingin bintang buku ini terpisah dari buku lain.
5. Daftarkan di rak: tambah satu objek di array `BOOKS` pada `index.html` root (folder, judul, deskripsi, cover).
6. Commit dan push ke `main`; Vercel otomatis deploy.

---

# Buku 1: Istana Mulut Putri Iris 👑

Buku cerita interaktif + teman makan untuk membantu Iris makan: **suap sendiri → kunyah di geraham (Mulan & Belle) → telan bersama Cinderella**.
Ada di `books/istana-mulut/`. Dibuat untuk layar **landscape** di tablet dan HP. Situs statis murni (HTML/CSS/JS), tanpa build.

## Isi
- **Baca Cerita**: 7 bab, tiap bab punya kegiatan ketuk-ketuk di gambar istana mulut. Ada narasi suara bahasa Indonesia.
- **Mulai Makan**: pendamping makan langkah demi langkah (pilih makanan → suap → kunyah → telan), hitungan suapan, target, timer, dan tombol "panggilan Princess" untuk orang tua.
- **Panduan Orang Tua**: tahan tombol 👪 selama 1 detik (supaya tidak terbuka tak sengaja oleh anak). Di sini juga bisa mengatur target suapan.
- Bintang & hitungan suapan tersimpan di perangkat (localStorage). Bisa dipakai offline setelah dibuka sekali.

## Deploy ke Vercel
1. Di vercel.com → **Add New… → Project** → pilih repo `irismakan` (branch yang ingin dipublikasikan).
2. Framework Preset: **Other**. Build Command & Output Directory: kosongkan. Klik **Deploy**.
   (atau lewat CLI: `npx vercel --prod` di folder ini)

## Pasang sebagai aplikasi layar penuh
- iPhone/iPad (Safari): Bagikan → **Tambah ke Layar Utama**
- Android (Chrome): menu ⋮ → **Pasang aplikasi**

## Mengubah isi
- Teks cerita & kegiatan: `PAGES` di `books/istana-mulut/app.js`; daftar makanan: `FOODS`; kalimat Princess: `GREET`, `CUES`, `PRAISE`.
- Ganti gambar: timpa `assets/hero.webp` dan `assets/palace.webp` di folder buku (rasio 16:9).
- Setelah mengubah file, naikkan `VERSION` di `books/istana-mulut/sw.js` agar cache offline diperbarui.
