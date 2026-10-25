# StokFlow

Aplikasi manajemen stok berbasis React, TypeScript, dan Vite, dipublikasikan melalui GitHub Pages.

**Website live:** https://toniimam.github.io/

## Status terverifikasi

- Login admin memakai Supabase Auth.
- Data inventaris dan transaksi tersimpan di Supabase.
- Audit 26 Oktober 2026 menemukan 1.259 barang, 12 brand, 145 penjualan, dan 192 transaksi.
- Target omzet bulanan per brand tersimpan di `brand.target_bulanan`.
- Omzet dashboard dihitung dari `penjualan.qty × penjualan.harga`, menggunakan tanggal dan harga transaksi tersimpan.
- Halaman **Penjualan** mencatat penjualan melalui RPC atomik yang membuat catatan penjualan dan transaksi stok dalam satu transaksi database.
- Halaman **Barang Masuk** mencatat stok masuk melalui RPC yang mengunci barang dan memvalidasi stok yang diharapkan sebelum menyimpan.
- Build TypeScript/Vite dan deployment GitHub Pages berhasil pada commit `d60d1b21da1c8a3d5ee4e4d432dc2cdafe4dea6f`.

## Pengamanan database yang diterapkan

- View `public.v_stock` menggunakan `security_invoker=true`; akses anonim ke view dicabut.
- RPC pencatatan penjualan, barang masuk, dan penghapusan penjualan memeriksa identitas admin.
- RPC transaksi sensitif menggunakan `SECURITY INVOKER`; akses anonim ke RPC terkait dicabut.
- RPC pencatatan penjualan dan barang masuk menghitung stok berdasarkan ledger transaksi yang sama dengan aplikasi.
- Akses anonim ke fungsi pembatas percobaan login dicabut karena fungsi tersebut tidak dipakai oleh aplikasi saat ini dan tabel terkait tidak memiliki kebijakan RLS.
- Tidak ada service-role key di frontend.

## Roadmap

1. **Dashboard dan target omzet per brand:** selesai dan ter-deploy.
2. **Keamanan RPC serta pencatatan penjualan dan barang masuk:** implementasi dan build selesai. Uji alur nyata dengan akun admin masih diperlukan sebelum dinyatakan terverifikasi operasional.
3. **Edit/hapus penjualan dari antarmuka:** masih perlu dihubungkan ke RPC atomik yang tersedia, lalu diuji agar stok rollback tetap konsisten.
4. **Laporan:** filter periode, ringkasan omzet lintas brand, dan ekspor laporan.
5. **Penguatan keamanan lanjutan:** aktifkan perlindungan kata sandi bocor pada pengaturan Supabase Auth dan audit kebijakan percobaan login.
6. **Optimasi:** evaluasi indeks foreign key dan uji regresi stok, transaksi, serta akses admin/non-admin.

## Pengembangan

```bash
npm install
npm run dev
npm run build
```

## Catatan keamanan

Gunakan hanya Supabase publishable key pada frontend. Jangan pernah memasukkan service-role key atau secret key ke browser atau repository. Semua operasi database harus tetap dilindungi RLS, validasi, dan pemeriksaan hak admin.
