# StokFlow

Aplikasi web manajemen stok barang berbasis React, TypeScript, Vite, dan Tailwind CSS.

## Status saat ini
Fondasi aplikasi dan dashboard pratinjau sudah dibuat. Daftar barang dan ringkasan stok memakai data contoh lokal di browser. Belum ada koneksi Supabase dan belum digunakan untuk transaksi stok sebenarnya.

## Pengembangan lokal
```bash
npm install
npm run dev
npm run build
```

## Rencana berikutnya
1. Verifikasi deployment dan pratinjau live.
2. Konfigurasi Supabase dengan public/anon key, autentikasi, dan Row Level Security (RLS).
3. Implementasi barang, transaksi masuk, penjualan, dan rollback stok yang aman.
4. Statistik semua brand dan ekspor laporan.

## Keamanan
Jangan pernah menaruh Supabase service-role key di browser atau repository. Integrasi database harus memakai kebijakan RLS dan validasi transaksi di sisi database.