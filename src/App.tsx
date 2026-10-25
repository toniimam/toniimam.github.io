import { useMemo, useState } from 'react'
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, Boxes, ChevronDown,
  CircleHelp, Download, LayoutDashboard, Menu, MoreHorizontal, Package,
  Plus, Search, Settings2, ShoppingCart, SlidersHorizontal, Sparkles,
  TrendingUp, Truck, X
} from 'lucide-react'

type Product = { id: number; name: string; sku: string; brand: string; category: string; stock: number; price: number; status: 'Aman' | 'Menipis' | 'Habis' }
const initialProducts: Product[] = [
  { id: 1, name: 'Handle Pintu Dekkson', sku: 'DK-HDL-204', brand: 'Dekkson', category: 'Handle pintu', stock: 48, price: 185000, status: 'Aman' },
  { id: 2, name: 'Engsel Heavy Duty 5”', sku: 'DK-HNG-510', brand: 'Dekkson', category: 'Engsel', stock: 8, price: 195000, status: 'Menipis' },
  { id: 3, name: 'Handle Lever Bremen', sku: 'BR-LVR-110', brand: 'Bremen', category: 'Handle pintu', stock: 26, price: 125000, status: 'Aman' },
  { id: 4, name: 'Floor Hinge 100kg', sku: 'DK-FH-100', brand: 'Dekkson', category: 'Aksesoris pintu', stock: 0, price: 680000, status: 'Habis' },
  { id: 5, name: 'Kunci Pintu Minimalis', sku: 'HM-LCK-021', brand: 'Hampton', category: 'Kunci pintu', stock: 13, price: 89000, status: 'Aman' },
]
const rupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Barang & Stok', icon: Boxes },
  { label: 'Penjualan', icon: ShoppingCart },
  { label: 'Barang Masuk', icon: Truck },
  { label: 'Laporan', icon: Activity },
]
export default function App() {
  const [products, setProducts] = useState(initialProducts)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newStock, setNewStock] = useState('0')
  const [notice, setNotice] = useState('')
  const filtered = useMemo(() => products.filter(p => [p.name, p.sku, p.brand, p.category].some(v => v.toLowerCase().includes(query.toLowerCase()))), [products, query])
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length
  const outStock = products.filter(p => p.stock === 0).length
  function addProduct() {
    if (!newName.trim() || !newBrand.trim()) { setNotice('Isi nama barang dan brand terlebih dahulu.'); return }
    const stock = Math.max(0, Number(newStock) || 0)
    const product: Product = { id: Date.now(), name: newName.trim(), sku: 'STK-' + String(products.length + 1).padStart(3, '0'), brand: newBrand.trim(), category: 'Belum dikategorikan', stock, price: 0, status: stock === 0 ? 'Habis' : stock <= 10 ? 'Menipis' : 'Aman' }
    setProducts(current => [product, ...current])
    setNewName(''); setNewBrand(''); setNewStock('0'); setShowAdd(false)
    setNotice('Barang ditambahkan ke demo lokal. Data belum tersimpan ke database.')
  }
  function exportCsv() {
    const rows = [['Nama Barang', 'SKU', 'Brand', 'Kategori', 'Stok', 'Harga'], ...products.map(p => [p.name, p.sku, p.brand, p.category, String(p.stock), String(p.price)])]
    const csv = rows.map(row => row.map(v => '"' + v.replaceAll('"', '""') + '"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'stokflow-barang.csv'; a.click(); URL.revokeObjectURL(url)
    setNotice('File CSV berhasil disiapkan dari data demo lokal.')
  }
  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Tutup menu" onClick={() => setMobileNav(false)} />}
      <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')}>
        <div className="brand-lockup"><div className="brand-mark"><Boxes size={22} /></div><div><strong>stokflow</strong><span>INVENTORY SYSTEM</span></div><button className="close-menu" onClick={() => setMobileNav(false)} aria-label="Tutup menu"><X size={18} /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace"><div className="workspace-avatar">DH</div><div><b>D’House Outlet</b><span>Manajemen stok</span></div><ChevronDown size={16} /></button>
        <div className="nav-label">MENU UTAMA</div>
        <nav>{navItems.map(item => { const Icon = item.icon; return <button key={item.label} className={'nav-item ' + (activeNav === item.label ? 'nav-active' : '')} onClick={() => { setActiveNav(item.label); setMobileNav(false) }}><Icon size={18} strokeWidth={1.9} /><span>{item.label}</span>{item.label === 'Barang & Stok' && <span className="nav-count">{products.length}</span>}</button> })}</nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18} /></div><b>Butuh bantuan?</b><p>Pelajari cara mengelola stok dengan lebih mudah.</p><button onClick={() => setNotice('Panduan akan tersedia pada tahap berikutnya.')}>Lihat panduan <ArrowUpRight size={14} /></button></div><button className="nav-item settings" onClick={() => setNotice('Pengaturan akan diaktifkan pada tahap berikutnya.')}><Settings2 size={18} /><span>Pengaturan</span></button><div className="profile"><div className="profile-avatar">SP</div><div><b>Sales Outlet</b><span>Administrator demo</span></div><MoreHorizontal size={19} /></div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Buka menu"><Menu size={21} /></button><div className="breadcrumb">Workspace <span>/</span> <b>{activeNav}</b></div><div className="top-actions"><div className="system-status"><span /> Sistem demo aktif</div><button className="icon-button" aria-label="Notifikasi" onClick={() => setNotice('Belum ada notifikasi baru.')}><Bell size={19} /><i /></button><div className="top-avatar">SP</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><Sparkles size={14} /> RINGKASAN INVENTARIS</div><h1>{activeNav === 'Dashboard' ? 'Dashboard' : activeNav}</h1><p>Pantau stok dan aktivitas barang outlet dalam satu tempat.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={exportCsv}><Download size={16} /> Ekspor data</button><button className="button-primary" onClick={() => setShowAdd(true)}><Plus size={17} /> Tambah barang</button></div></div>
          <div className="demo-alert"><div className="alert-symbol"><Activity size={17} /></div><div><b>Mode pratinjau</b><span>Data saat ini adalah contoh untuk menguji tampilan. Belum tersambung ke Supabase.</span></div><span className="demo-pill">DEMO DATA</span></div>
          <section className="metric-grid">
            <article className="metric-card"><div className="metric-top"><span>Total jenis barang</span><div className="metric-icon purple"><Package size={19} /></div></div><div className="metric-value">{products.length}<small> item</small></div><div className="metric-foot"><span className="foot-neutral"><Boxes size={14} /> Terdaftar di demo</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Total stok tersedia</span><div className="metric-icon blue"><Boxes size={19} /></div></div><div className="metric-value">{totalStock}<small> unit</small></div><div className="metric-foot"><span className="foot-positive"><TrendingUp size={14} /> Stok seluruh brand</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Stok menipis</span><div className="metric-icon amber"><ArrowDownLeft size={19} /></div></div><div className="metric-value">{lowStock}<small> item</small></div><div className="metric-foot"><span className="foot-warning">Perlu segera diperiksa</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Stok habis</span><div className="metric-icon red"><ArrowUpRight size={19} /></div></div><div className="metric-value">{outStock}<small> item</small></div><div className="metric-foot"><span className="foot-danger">Perlu pengadaan</span></div></article>
          </section>
          <section className="chart-grid">
            <article className="panel activity-panel"><div className="panel-heading"><div><h2>Aktivitas inventaris</h2><p>Gambaran pergerakan stok</p></div><button className="period-select" onClick={() => setNotice('Grafik transaksi akan aktif setelah database terhubung.')}>7 hari terakhir <ChevronDown size={15} /></button></div><div className="chart-placeholder"><div className="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-canvas"><div className="chart-gridlines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label="Grafik contoh aktivitas stok"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5c62e8" stopOpacity=".2"/><stop offset="100%" stopColor="#5c62e8" stopOpacity="0"/></linearGradient></defs><path d="M0 135 C40 120 48 142 82 105 S130 125 166 89 S210 111 250 73 S300 93 335 60 S380 85 420 50 S475 77 510 39 S565 55 600 20 L600 180 L0 180Z" fill="url(#area)"/><path d="M0 135 C40 120 48 142 82 105 S130 125 166 89 S210 111 250 73 S300 93 335 60 S380 85 420 50 S475 77 510 39 S565 55 600 20" fill="none" stroke="#6268e8" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round"/></svg><div className="chart-x-labels"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div></div></div><div className="chart-legend"><span><i className="legend-dot purple-dot" /> Barang masuk</span><span><i className="legend-dot blue-dot" /> Barang terjual</span><small>Ilustrasi, bukan data transaksi asli</small></div></article>
            <article className="panel brand-panel"><div className="panel-heading"><div><h2>Komposisi brand</h2><p>Jumlah stok per brand</p></div><button className="more-button" aria-label="Info brand" onClick={() => setNotice('Komposisi brand dihitung dari contoh barang lokal.') }><MoreHorizontal size={20} /></button></div><div className="brand-donut-wrap"><div className="brand-donut"><div><strong>{totalStock}</strong><span>Total unit</span></div></div></div><div className="brand-legend">{Array.from(new Set(products.map(p => p.brand))).slice(0,4).map((brand, i) => { const count = products.filter(p => p.brand === brand).reduce((s,p) => s+p.stock,0); return <div className="brand-line" key={brand}><span><i className={'legend-dot brand-dot dot-' + i} />{brand}</span><b>{count} unit</b></div> })}</div></article>
          </section>
          <section className="panel inventory-panel"><div className="inventory-heading"><div><h2>Daftar barang</h2><p>Ringkasan produk dan ketersediaan stok</p></div><button className="text-action" onClick={() => setActiveNav('Barang & Stok')}>Lihat semua <ArrowUpRight size={15} /></button></div><div className="table-tools"><div className="search-field"><Search size={17} /><input aria-label="Cari barang" placeholder="Cari nama barang, SKU, atau brand..." value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Hapus pencarian" onClick={() => setQuery('')}><X size={15} /></button>}</div><button className="filter-button" onClick={() => setNotice('Filter lanjutan akan tersedia pada tahap berikutnya.')}><SlidersHorizontal size={16} /> Filter</button></div><div className="table-scroll"><table><thead><tr><th>BARANG</th><th>BRAND</th><th>KATEGORI</th><th>STOK</th><th>HARGA / UNIT</th><th>STATUS</th><th></th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="product-cell"><div className="product-icon"><Package size={18} /></div><div><b>{p.name}</b><span>{p.sku}</span></div></div></td><td><span className="brand-name">{p.brand}</span></td><td className="muted-cell">{p.category}</td><td><b className={p.stock === 0 ? 'stock-zero' : ''}>{p.stock}</b><span className="unit-label"> unit</span></td><td className="price-cell">{p.price ? rupiah(p.price) : 'Belum diatur'}</td><td><span className={'status-badge ' + (p.status === 'Aman' ? 'status-safe' : p.status === 'Menipis' ? 'status-low' : 'status-out')}><i />{p.status}</span></td><td><button className="row-more" aria-label={'Aksi ' + p.name} onClick={() => setNotice(p.name + ': aksi detail akan diaktifkan pada tahap berikutnya.')}><MoreHorizontal size={18} /></button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7} className="empty-state">Tidak ada barang yang cocok dengan “{query}”.</td></tr>}</tbody></table></div><div className="table-footer"><span>Menampilkan <b>{filtered.length}</b> dari <b>{products.length}</b> barang</span><span>Data demo <span className="footer-dot">•</span> Belum tersimpan ke database</span></div></section>
          <footer className="page-footer"><span>© 2026 StokFlow <span>·</span> Inventory made clearer.</span><span><i /> Semua data di halaman ini bersifat demo</span></footer>
        </div>
      </main>
      {showAdd && <div className="modal-backdrop" role="presentation" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><div className="eyebrow">INVENTARIS</div><h2 id="modal-title">Tambah barang</h2></div><button className="icon-button" aria-label="Tutup" onClick={() => setShowAdd(false)}><X size={19} /></button></div><p className="modal-copy">Tambahkan item contoh untuk mencoba tampilan daftar barang.</p><label>Nama barang<input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Contoh: Handle pintu minimalis" autoFocus /></label><label>Brand<input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="Contoh: Dekkson" /></label><label>Stok awal<input type="number" min="0" value={newStock} onChange={e => setNewStock(e.target.value)} /></label><div className="modal-warning">Barang hanya ditambahkan di browser ini. Belum tersimpan permanen.</div><div className="modal-actions"><button className="button-secondary" onClick={() => setShowAdd(false)}>Batal</button><button className="button-primary" onClick={addProduct}><Plus size={16} /> Simpan demo</button></div></section></div>}
      {notice && <div className="toast" role="status"><span className="toast-check">i</span><span>{notice}</span><button aria-label="Tutup pesan" onClick={() => setNotice('')}><X size={16} /></button></div>}
    </div>
  )
}
