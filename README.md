# Istana Mulut Putri Iris 👑

Buku cerita interaktif + teman makan untuk membantu Iris makan: **suap sendiri → kunyah di geraham (Mulan & Belle) → telan bersama Cinderella**.
Dibuat untuk layar **landscape** di tablet dan HP. Situs statis murni (HTML/CSS/JS), tanpa build.

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
- Teks cerita & kegiatan: `PAGES` di `app.js`; daftar makanan: `FOODS`; kalimat Princess: `GREET`, `CUES`, `PRAISE`.
- Ganti gambar: timpa `assets/hero.webp` dan `assets/palace.webp` (rasio 16:9).
- Setelah mengubah file, naikkan `VERSION` di `sw.js` agar cache offline diperbarui.
