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
- Data aplikasi di memori dibersihkan saat logout atau sesi admin gagal diverifikasi.
- Akses anonim ke fungsi pembatas percobaan login dicabut karena fungsi tersebut tidak dipakai oleh aplikasi saat ini dan tabel terkait tidak memiliki kebijakan RLS.
- Indeks foreign key dan indeks tanggal penjualan dibuat untuk membantu pencarian, join, dan filter laporan.
- Tidak ada service-role key di frontend.

## Roadmap

1. **Dashboard dan target omzet per brand:** selesai dan ter-deploy.
2. **Keamanan RPC serta pencatatan penjualan dan barang masuk:** implementasi dan build selesai. Uji alur nyata dengan akun admin masih diperlukan sebelum dinyatakan terverifikasi operasional.
3. **Edit/hapus penjualan dari antarmuka:** tombol edit dan hapus sudah dihubungkan ke RPC atomik. Edit mempertahankan barang yang sama dan memperbarui ledger terkait, hapus menghapus catatan penjualan beserta transaksi stok terkait. Uji operasional tetap diperlukan dengan transaksi uji yang disetujui.
4. **Laporan:** selesai diimplementasikan dan ter-deploy pada commit `530874bb5cd6aeec17347afcaa906a946e4433c2`. Mendukung filter tanggal dan brand, ringkasan omzet/unit/transaksi per brand, detail berhalaman 7 baris, serta ekspor CSV yang mengikuti filter aktif.
5. **Pengamanan sesi:** pembersihan data inventaris, transaksi, penjualan, brand, draft target, dan halaman tabel ketika logout atau sesi admin gagal diverifikasi sudah diterapkan. Peringatan Supabase Auth tentang perlindungan kata sandi bocor masih terbuka dan perlu diaktifkan melalui pengaturan Auth di Supabase Dashboard, pengaturan tersebut tidak tersedia melalui konektor yang digunakan pada tahap ini.
6. **Optimasi database:** indeks untuk `barang.brand_id`, `penjualan.barang_id`, `transaksi.barang_id`, serta `penjualan.tanggal_pembelian` telah dibuat dan diverifikasi. Uji regresi operasional stok, transaksi, serta akses admin/non-admin masih diperlukan.

## Pengembangan

```bash
npm install
npm run dev
npm run build
```

## Catatan keamanan

Gunakan hanya Supabase publishable key pada frontend. Jangan pernah memasukkan service-role key atau secret key ke browser atau repository. Semua operasi database harus tetap dilindungi RLS, validasi, dan pemeriksaan hak admin.
