# StokFlow

Aplikasi manajemen stok berbasis React, TypeScript, dan Vite, dipublikasikan melalui GitHub Pages.

**Website live:** https://toniimam.github.io/

## Status terverifikasi

- Login admin menggunakan Supabase Auth.
- Data tersimpan di Supabase, bukan sekadar data contoh browser.
- Dashboard membaca 1.259 barang, 12 brand, 145 penjualan, dan 192 transaksi pada audit 26 Oktober 2026.
- Target omzet bulanan tiap brand disimpan di `brand.target_bulanan`.
- Realisasi omzet bulan berjalan dihitung dari `penjualan.qty × penjualan.harga`, berdasarkan `tanggal_pembelian`, sehingga memakai harga yang tercatat saat transaksi.
- Deployment otomatis berjalan melalui GitHub Actions.
- Tabel utama menggunakan Row Level Security (RLS) dengan kebijakan admin.

## Keamanan yang sudah diperkuat

- View `public.v_stock` memakai `security_invoker=true` dan akses anonim dicabut agar kebijakan RLS tabel sumber tetap berlaku.
- Fungsi `edit_penjualan_atomic` memerlukan identitas pengguna yang terautentikasi dan terdaftar sebagai admin.
- Akses anonim ke fungsi tersebut dicabut. Validasi kuantitas, harga, brand, dan tanggal ditambahkan di sisi database.
- Tidak ada service-role key yang digunakan pada frontend.

## Roadmap

1. **Penguatan keamanan lanjutan:** tindak lanjut pemeriksaan Supabase, termasuk perlindungan kata sandi bocor dan peninjauan tabel pembatasan percobaan login.
2. **Alur transaksi lengkap:** implementasi dan pengujian UI untuk barang masuk, catat penjualan, edit/hapus penjualan dengan rollback stok atomik.
3. **Laporan:** statistik lintas brand, filter periode, dan ekspor laporan.
4. **Validasi operasional:** uji akses admin/non-admin, konsistensi stok terhadap transaksi, serta uji regresi fitur sebelum setiap rilis.

## Pengembangan lokal

```bash
npm install
npm run dev
npm run build
```

## Catatan keamanan

Frontend hanya boleh menggunakan Supabase publishable key. Jangan pernah memasukkan service-role key atau secret key ke kode browser maupun repository. Semua operasi data harus tetap dilindungi RLS dan validasi database.
