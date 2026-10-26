# Rak Buku Cerita Iris 📚

Satu repo, banyak buku cerita interaktif. Halaman utama (`index.html`) adalah **rak buku**; tiap buku ada di `books/<nama-buku>/`.

```
index.html                 ← rak buku (daftar BOOKS)
books/istana-mulut-level-1/ ← Istana Mulut Putri Iris, Level 1 (7 bab, dasar)
books/istana-mulut/        ← Istana Mulut Putri Iris, Level 2 (10 bab)
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

# Istana Mulut Putri Iris 👑 (Level 2; Level 1 ada di `books/istana-mulut-level-1/`)

Buku cerita interaktif + teman makan untuk membantu Iris makan: **suap sendiri → kunyah di geraham (Mulan & Belle) → telan bersama Cinderella**.
Ada di `books/istana-mulut/`. Dibuat untuk layar **landscape** di tablet dan HP. Situs statis murni (HTML/CSS/JS), tanpa build.

## Isi
- **Baca Cerita**: 10 bab, tiap bab punya kegiatan ketuk-ketuk di gambar istana mulut. Bab baru Level 2: Aturan Lidah Cinderella (jangan parkir makanan di lidah), Ketukan Kunyah Cepat 1–8, dan Sensor Bubur Bintang. Ada narasi suara bahasa Indonesia.
- **Mulai Makan**: pendamping makan langkah demi langkah (pilih makanan → suap sendiri → oper dari lidah ke geraham → kunyah cepat dengan ketukan otomatis → sensor Bubur Bintang → telan). Ada peringatan bila makanan ditahan di lidah >4 dtk atau diemut >5 dtk setelah halus, timer per suapan + total, hitungan suapan/target, dan 6 tombol "panggilan Princess" untuk orang tua.
- **Suara Princess** (tombol 🎀): memilih suara perempuan Indonesia otomatis, atur nada & tempo, atau mode lonceng saja.
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
