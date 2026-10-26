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
- Build TypeScript/Vite dan deployment GitHub Pages sebelumnya berhasil pada commit `d60d1b21da1c8a3d5ee4e4d432dc2cdafe4dea6f`; status deployment untuk perubahan UI paling baru masih perlu diverifikasi melalui GitHub Actions.
- Dashboard menampilkan stok aktual per barang, bukan jumlah stok yang diakumulasi menjadi satu angka. Saldo minus tetap terlihat untuk barang PO.
- Navigasi HP memakai navbar bawah tanpa sidebar. Navigasi desktop berada di bagian atas.
- Pagination 7 baris per halaman tersedia pada daftar barang, riwayat penjualan, barang masuk, dan detail laporan.
- Menu **Penyesuaian Stok** menyimpan selisih sebagai transaksi ledger dan mendukung saldo akhir negatif untuk barang PO. Tombol tambah barang dan ekspor global saat ini sengaja tidak ditampilkan, menunggu halaman khusus.

## Pengamanan database yang diterapkan

- View `public.v_stock` menggunakan `security_invoker=true`; akses anonim ke view dicabut.
- RPC pencatatan penjualan, barang masuk, edit penjualan (kedua overload), dan penghapusan penjualan memeriksa identitas admin.
- RPC transaksi sensitif menggunakan `SECURITY INVOKER` dan `search_path` kosong; akses anonim ke RPC terkait dicabut.
- Overload lama `edit_penjualan_atomic` yang menerima `p_barang_id` diperkuat dengan pemeriksaan admin, dan uji tanpa klaim autentikasi berhasil ditolak.
- RPC pencatatan penjualan dan barang masuk menghitung stok berdasarkan ledger transaksi yang sama dengan aplikasi.
- Data aplikasi di memori dibersihkan saat logout atau sesi admin gagal diverifikasi.
- Akses anonim ke fungsi pembatas percobaan login dicabut karena fungsi tersebut tidak dipakai oleh aplikasi saat ini dan tabel terkait tidak memiliki kebijakan RLS.
- Indeks foreign key dan indeks tanggal penjualan dibuat untuk membantu pencarian, join, dan filter laporan.
- Tidak ada service-role key di frontend.

## Roadmap

1. **Dashboard dan target omzet per brand:** selesai dan ter-deploy.
2. **Keamanan RPC serta pencatatan penjualan dan barang masuk:** uji regresi terisolasi berhasil untuk stok minus, barang masuk, penyesuaian saldo, edit, dan hapus. Seluruh data uji di-rollback, hitungan produksi tetap 1.259 barang, 145 penjualan, dan 192 transaksi. Uji UI memakai sesi browser admin tetap belum dilakukan.
3. **Edit/hapus penjualan dari antarmuka:** RPC atomik diuji dalam transaksi terisolasi. Alur uji: stok awal 3, jual 5 menghasilkan -2, masuk 7 menghasilkan 5, koreksi ke 2, edit jumlah jual menjadi 4 menghasilkan 3, lalu hapus penjualan mengembalikan stok ke 7. Tidak ada data uji tersisa.
4. **Laporan:** selesai diimplementasikan dan ter-deploy pada commit `530874bb5cd6aeec17347afcaa906a946e4433c2`. Mendukung filter tanggal dan brand, ringkasan omzet/unit/transaksi per brand, detail berhalaman 7 baris, serta ekspor CSV yang mengikuti filter aktif.
5. **Pengamanan sesi dan Auth:** pembersihan data aplikasi saat logout atau sesi gagal diverifikasi sudah diterapkan. Peringatan perlindungan kata sandi bocor masih terbuka dan perlu diaktifkan melalui Supabase Dashboard. Tabel `app_login_attempts` tetap tanpa policy RLS dan fungsi pembatas percobaan login tidak dapat dipanggil oleh `anon` maupun `authenticated`, sesuai konfigurasi yang diaudit; jangan menambahkan policy tabel secara terbuka.
6. **Optimasi database dan pemeriksaan akses:** indeks utama telah dibuat dan diverifikasi. Uji logika transaksi terisolasi serta penolakan overload edit tanpa autentikasi lulus. Sisa pekerjaan: aktifkan leaked-password protection, verifikasi deployment UI terbaru, lalu lakukan smoke test UI menggunakan sesi admin dan pemeriksaan akses non-admin melalui alur autentikasi sebenarnya.

## Pengembangan

```bash
npm install
npm run dev
npm run build
```

## Catatan keamanan

Gunakan hanya Supabase publishable key pada frontend. Jangan pernah memasukkan service-role key atau secret key ke browser atau repository. Semua operasi database harus tetap dilindungi RLS, validasi, dan pemeriksaan hak admin.
