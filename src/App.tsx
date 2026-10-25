import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, Bell, Boxes, ChevronDown, CircleHelp, Download, LayoutDashboard, Menu, MoreHorizontal, Package, Plus, Search, Settings2, ShoppingCart, SlidersHorizontal, Sparkles, TrendingUp, Truck, X } from 'lucide-react'

type Brand = { id: number; nama: string }
type Product = { id: number; name: string; sku: string; brand: string; category: string; stock: number; price: number; status: 'Aman' | 'Menipis' | 'Habis' }
type Tx = { barang_id: number; type: string; qty: number; tanggal?: string }

const SUPABASE_URL = 'https://rbpxeuqszgxomrmjhaet.supabase.co'
const SUPABASE_KEY = 'sb_publishable_UDOUw4i_aFHLgVx3dYN2Fw_bCWUnVcV'

async function api(path: string, options: RequestInit = {}, token = '') {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) throw new Error(data?.message || data?.error_description || data?.error || `HTTP ${res.status}`)
  return data
}

async function apiAll(path: string, currentToken = '') {
  const pageSize = 1000
  const rows: any[] = []
  for (let from = 0; ; from += pageSize) {
    const batch = await api(path, { headers: { Range: `${from}-${from + pageSize - 1}` } }, currentToken)
    if (!Array.isArray(batch)) throw new Error('Format data dari Supabase tidak sesuai.')
    rows.push(...batch)
    if (batch.length < pageSize) return rows
  }
}

const rupiah = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Barang & Stok', icon: Boxes },
  { label: 'Penjualan', icon: ShoppingCart },
  { label: 'Barang Masuk', icon: Truck },
  { label: 'Laporan', icon: Activity },
]

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('stokflow_token') || '')
  const [email, setEmail] = useState(() => localStorage.getItem('stokflow_email') || '')
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newStock, setNewStock] = useState('0')
  const [newCategory, setNewCategory] = useState('Belum dikategorikan')
  const [newPrice, setNewPrice] = useState('0')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  async function loadData(currentToken = token) {
    setLoading(true)
    try {
      const [rawBarang, rawBrand, rawTx] = await Promise.all([
        apiAll('/rest/v1/barang?select=id,nama,stok_awal,brand_id,sku,kategori,harga&order=nama.asc', currentToken),
        apiAll('/rest/v1/brand?select=id,nama&order=nama.asc', currentToken),
        apiAll('/rest/v1/transaksi?select=barang_id,type,qty,tanggal', currentToken),
      ])
      const brandList: Brand[] = rawBrand || []
      const txList: Tx[] = rawTx || []
      const result: Product[] = (rawBarang || []).map((b: any) => {
        const movement = txList.filter(t => t.barang_id === b.id).reduce((sum, t) => {
          if (t.type === 'masuk' || t.type === 'adjust_masuk') return sum + Number(t.qty)
          if (t.type === 'laku' || t.type === 'adjust_keluar') return sum - Number(t.qty)
          if (t.type === 'adjust') return sum + Number(t.qty)
          return sum
        }, 0)
        const stock = Number(b.stok_awal || 0) + movement
        return {
          id: b.id,
          name: b.nama,
          sku: b.sku || `STK-${b.id}`,
          brand: brandList.find(x => x.id === b.brand_id)?.nama || 'Tanpa brand',
          category: b.kategori || 'Belum dikategorikan',
          stock,
          price: Number(b.harga || 0),
          status: stock === 0 ? 'Habis' : stock <= 10 ? 'Menipis' : 'Aman',
        }
      })
      setBrands(brandList)
      setProducts(result)
      setTransactions(txList)
      setNotice(`Terhubung ke database StokFlow, ${result.length.toLocaleString('id-ID')} barang dimuat.`)
    } catch (e: any) {
      setNotice(`Gagal memuat data: ${e.message}`)
    } finally { setLoading(false) }
  }

  async function verifySession(currentToken: string, currentEmail: string) {
    try {
      await api(`/rest/v1/app_admins?select=email&limit=1`, {}, currentToken)
      setToken(currentToken); setEmail(currentEmail); await loadData(currentToken)
    } catch {
      localStorage.removeItem('stokflow_token'); localStorage.removeItem('stokflow_email'); setToken(''); setEmail('')
    }
  }

  useEffect(() => { if (token && email) verifySession(token, email) }, [])

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginLoading(true); setNotice('')
    try {
      const session = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: loginEmail.trim(), password }) })
      const access = session.access_token
      if (!access) throw new Error('Token login tidak diterima.')
      const adminRows = await api('/rest/v1/app_admins?select=email&limit=1', {}, access)
      if (!adminRows?.length) throw new Error('Akun berhasil login, tetapi email ini belum terdaftar sebagai admin StokFlow.')
      localStorage.setItem('stokflow_token', access); localStorage.setItem('stokflow_email', loginEmail.trim().toLowerCase())
      setToken(access); setEmail(loginEmail.trim().toLowerCase()); setPassword(''); await loadData(access)
    } catch (e: any) { setNotice(e.message || 'Login gagal.') }
    finally { setLoginLoading(false) }
  }

  async function addProduct() {
    if (!newName.trim() || !newBrand.trim()) { setNotice('Isi nama barang dan brand terlebih dahulu.'); return }
    try {
      const brandName = newBrand.trim()
      let brand = brands.find(b => b.nama.toLowerCase() === brandName.toLowerCase())
      if (!brand) {
        const created = await api('/rest/v1/brand', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ nama: brandName, aktif: true }) }, token)
        brand = created[0]
      }
      if (!brand) throw new Error('Brand gagal dibuat atau tidak dikembalikan oleh database.')
      const sku = `STK-${Date.now()}`
      await api('/rest/v1/barang', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ nama: newName.trim(), stok_awal: Math.max(0, Number(newStock) || 0), brand_id: brand.id, sku, kategori: newCategory.trim() || 'Belum dikategorikan', harga: Math.max(0, Number(newPrice) || 0) }) }, token)
      setShowAdd(false); setNewName(''); setNewBrand(''); setNewStock('0'); setNewCategory('Belum dikategorikan'); setNewPrice('0')
      await loadData(token)
      setNotice('Barang berhasil disimpan ke Supabase.')
    } catch (e: any) { setNotice(`Gagal menyimpan barang: ${e.message}`) }
  }

  function logout() { localStorage.removeItem('stokflow_token'); localStorage.removeItem('stokflow_email'); setToken(''); setEmail(''); setProducts([]) }
  function exportCsv() {
    const rows = [['Nama Barang', 'SKU', 'Brand', 'Kategori', 'Stok', 'Harga'], ...products.map(p => [p.name, p.sku, p.brand, p.category, String(p.stock), String(p.price)])]
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })); const a = document.createElement('a'); a.href = url; a.download = 'stokflow-barang.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const filtered = useMemo(() => products.filter(p => [p.name, p.sku, p.brand, p.category].some(v => v.toLowerCase().includes(query.toLowerCase()))), [products, query])
  const totalStock = products.reduce((s, p) => s + p.stock, 0)
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length
  const outStock = products.filter(p => p.stock <= 0).length

  const safeStock = products.filter(p => p.stock > 10).length
  const inventoryValue = products.reduce((sum, p) => sum + Math.max(0, p.stock) * Math.max(0, p.price), 0)
  const now = new Date()
  const monthTransactions = transactions.filter(t => t.tanggal && new Date(t.tanggal).getFullYear() === now.getFullYear() && new Date(t.tanggal).getMonth() === now.getMonth())
  const soldThisMonth = monthTransactions.filter(t => t.type === 'laku').reduce((sum, t) => sum + Number(t.qty || 0), 0)
  const incomingThisMonth = monthTransactions.filter(t => t.type === 'masuk' || t.type === 'adjust_masuk').reduce((sum, t) => sum + Number(t.qty || 0), 0)
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index))
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
    const dayTx = transactions.filter(t => t.tanggal && new Date(t.tanggal).getFullYear() === date.getFullYear() && new Date(t.tanggal).getMonth() === date.getMonth() && new Date(t.tanggal).getDate() === date.getDate())
    return { key, label: date.toLocaleDateString('id-ID', { weekday: 'short' }), sold: dayTx.filter(t => t.type === 'laku').reduce((sum, t) => sum + Number(t.qty || 0), 0), incoming: dayTx.filter(t => t.type === 'masuk' || t.type === 'adjust_masuk').reduce((sum, t) => sum + Number(t.qty || 0), 0) }
  })
  const trendMax = Math.max(1, ...lastSevenDays.flatMap(d => [d.sold, d.incoming]))
  const activeBrands = new Set(products.map(p => p.brand).filter(b => b !== 'Tanpa brand')).size
  const recentActivityCount = monthTransactions.length

  if (!token) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: '#f5f6fb', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <form onSubmit={login} style={{ width: '100%', maxWidth: 420, background: '#fff', padding: 32, borderRadius: 20, boxShadow: '0 18px 60px rgba(20,30,60,.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}><div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#5c62e8', color: '#fff' }}><Boxes size={23} /></div><div><b style={{ fontSize: 22 }}>stokflow</b><div style={{ fontSize: 10, letterSpacing: 1.4, color: '#8990a3' }}>INVENTORY SYSTEM</div></div></div>
        <h1 style={{ margin: '0 0 8px', fontSize: 27 }}>Masuk ke StokFlow</h1><p style={{ color: '#72798b', marginTop: 0 }}>Gunakan akun Supabase yang sudah dibuat sebagai admin.</p>
        <label style={{ display: 'block', marginTop: 20, fontSize: 13, fontWeight: 700 }}>Email</label><input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} type="email" required placeholder="Email admin" style={{ width: '100%', boxSizing: 'border-box', padding: 13, marginTop: 7, border: '1px solid #dfe2eb', borderRadius: 10 }} />
        <label style={{ display: 'block', marginTop: 16, fontSize: 13, fontWeight: 700 }}>Password</label><input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="Password" style={{ width: '100%', boxSizing: 'border-box', padding: 13, marginTop: 7, border: '1px solid #dfe2eb', borderRadius: 10 }} />
        <button type="submit" disabled={loginLoading} style={{ width: '100%', marginTop: 22, padding: 13, border: 0, borderRadius: 10, background: '#5c62e8', color: '#fff', fontWeight: 800 }}>{loginLoading ? 'Memproses...' : 'Masuk'}</button>
        {notice && <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: '#fff5f5', color: '#b42318', fontSize: 13 }}>{notice}</div>}
      </form>
    </div>
  )

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Tutup menu" onClick={() => setMobileNav(false)} />}
      <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')}>
        <div className="brand-lockup"><div className="brand-mark"><Boxes size={22} /></div><div><strong>stokflow</strong><span>INVENTORY SYSTEM</span></div><button className="close-menu" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="workspace-label">WORKSPACE</div><button className="workspace"><div className="workspace-avatar">DH</div><div><b>D’House Outlet</b><span>Supabase aktif</span></div><ChevronDown size={16} /></button>
        <div className="nav-label">MENU UTAMA</div><nav>{navItems.map(item => { const Icon = item.icon; return <button key={item.label} className={'nav-item ' + (activeNav === item.label ? 'nav-active' : '')} onClick={() => { setActiveNav(item.label); setMobileNav(false) }}><Icon size={18} /><span>{item.label}</span>{item.label === 'Barang & Stok' && <span className="nav-count">{products.length}</span>}</button> })}</nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18} /></div><b>Database terhubung</b><p>Data StokFlow sekarang dibaca langsung dari Supabase.</p></div><button className="nav-item settings" onClick={logout}><Settings2 size={18} /><span>Keluar</span></button><div className="profile"><div className="profile-avatar">{email.slice(0, 2).toUpperCase()}</div><div><b>Administrator</b><span>{email}</span></div><MoreHorizontal size={19} /></div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div className="breadcrumb">Workspace <span>/</span> <b>{activeNav}</b></div><div className="top-actions"><div className="system-status"><span /> Supabase aktif</div><button className="icon-button" onClick={() => setNotice('Database tersambung dan data sudah dimuat.')}><Bell size={19} /></button><div className="top-avatar">{email.slice(0, 2).toUpperCase()}</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><Sparkles size={14} /> DATABASE STOKFLOW</div><h1>{activeNav}</h1><p>Data inventaris langsung dari Supabase, bukan data demo.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={exportCsv}><Download size={16} /> Ekspor data</button><button className="button-primary" onClick={() => setShowAdd(true)}><Plus size={17} /> Tambah barang</button></div></div>
          {notice && <div className="demo-alert"><div className="alert-symbol"><Activity size={17} /></div><div><b>Status</b><span>{notice}</span></div><button onClick={() => setNotice('')} style={{ marginLeft: 'auto', border: 0, background: 'transparent', cursor: 'pointer' }}><X size={16} /></button></div>}
          {showAdd && <section className="panel" style={{ marginBottom: 18, padding: 20 }}><div className="panel-heading"><div><h2>Tambah barang</h2><p>Data akan langsung disimpan ke Supabase.</p></div><button className="more-button" onClick={() => setShowAdd(false)}><X size={20} /></button></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}><input placeholder="Nama barang" value={newName} onChange={e => setNewName(e.target.value)} /><input placeholder="Brand" value={newBrand} onChange={e => setNewBrand(e.target.value)} /><input placeholder="Kategori" value={newCategory} onChange={e => setNewCategory(e.target.value)} /><input type="number" min="0" placeholder="Stok awal" value={newStock} onChange={e => setNewStock(e.target.value)} /><input type="number" min="0" placeholder="Harga" value={newPrice} onChange={e => setNewPrice(e.target.value)} /><button className="button-primary" onClick={addProduct}>Simpan ke database</button></div></section>}
          <section className="metric-grid"><article className="metric-card"><div className="metric-top"><span>Total jenis barang</span><div className="metric-icon purple"><Package size={19} /></div></div><div className="metric-value">{products.length}<small> item</small></div><div className="metric-foot"><span className="foot-neutral"><Boxes size={14} /> Database</span></div></article><article className="metric-card"><div className="metric-top"><span>Total stok tersedia</span><div className="metric-icon blue"><Boxes size={19} /></div></div><div className="metric-value">{totalStock}<small> unit</small></div><div className="metric-foot"><span className="foot-positive"><TrendingUp size={14} /> Semua brand</span></div></article><article className="metric-card"><div className="metric-top"><span>Stok menipis</span><div className="metric-icon amber"><ArrowDownLeft size={19} /></div></div><div className="metric-value">{lowStock}<small> item</small></div><div className="metric-foot"><span className="foot-warning">Perlu diperiksa</span></div></article><article className="metric-card"><div className="metric-top"><span>Stok habis</span><div className="metric-icon red"><ArrowUpRight size={19} /></div></div><div className="metric-value">{outStock}<small> item</small></div><div className="metric-foot"><span className="foot-danger">Perlu pengadaan</span></div></article></section>
          {activeNav === 'Dashboard' && <section className="chart-grid dashboard-grid">
            <article className="panel activity-panel">
              <div className="panel-heading"><div><h2>Komposisi kondisi stok</h2><p>Ringkasan kondisi seluruh barang dari database</p></div><span className="demo-pill">DATA LIVE</span></div>
              <div style={{ display: 'grid', gap: 18, marginTop: 25 }}>
                {[{ label: 'Stok aman', count: safeStock, color: '#29b783' }, { label: 'Stok menipis', count: lowStock, color: '#e6a43c' }, { label: 'Stok habis', count: outStock, color: '#e27676' }].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, color: '#707a8e', fontSize: 11 }}><span>{item.label}</span><b style={{ color: '#343d51' }}>{item.count.toLocaleString('id-ID')} barang</b></div>
                    <div style={{ height: 9, borderRadius: 99, background: '#f0f2f7', overflow: 'hidden' }}><div style={{ width: `${products.length ? item.count / products.length * 100 : 0}%`, height: '100%', borderRadius: 99, background: item.color, transition: 'width .25s ease' }} /></div>
                  </div>
                ))}
              </div>
              <div className="chart-legend" style={{ marginTop: 24 }}><span><i className="legend-dot" style={{ background: '#29b783' }} /> Aman: lebih dari 10 unit</span><span><i className="legend-dot" style={{ background: '#e6a43c' }} /> Menipis: 1–10 unit</span><span><i className="legend-dot" style={{ background: '#e27676' }} /> Habis: 0 atau kurang</span></div>
            </article>
            <article className="panel brand-panel">
              <div className="panel-heading"><div><h2>Stok per brand</h2><p>Lima brand dengan stok terbesar</p></div></div>
              <div style={{ display: 'grid', gap: 17, marginTop: 23 }}>
                {stockByBrand.map((brand, index) => <div key={brand.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 7, fontSize: 10, color: '#707a8e' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brand.name}</span><b style={{ color: '#343d51', flexShrink: 0 }}>{brand.stock.toLocaleString('id-ID')} unit</b></div>
                  <div style={{ height: 7, borderRadius: 99, background: '#f0f2f7', overflow: 'hidden' }}><div style={{ width: `${Math.max(0, brand.stock) / maxBrandStock * 100}%`, height: '100%', borderRadius: 99, background: ['#6268e8', '#55b7e7', '#f0b64c', '#ed8585', '#53b69a'][index] }} /></div>
                  <div style={{ marginTop: 5, fontSize: 9, color: '#a0a7b5' }}>{brand.items.toLocaleString('id-ID')} jenis barang</div>
                </div>)}
                {stockByBrand.length === 0 && <p className="empty-state">Belum ada data brand.</p>}
              </div>
            </article>
            <article className="panel inventory-panel dashboard-attention">
              <div className="inventory-heading"><div><h2>Perlu perhatian</h2><p>Barang dengan stok 10 unit atau kurang</p></div><button className="text-action" onClick={() => setActiveNav('Barang & Stok')}>Lihat semua <ArrowUpRight size={15} /></button></div>
              <div className="table-scroll"><table><thead><tr><th>BARANG</th><th>BRAND</th><th>STOK</th><th>STATUS</th></tr></thead><tbody>
                {attentionProducts.map(p => <tr key={p.id}><td><div className="product-cell"><div className="product-icon"><Package size={18} /></div><div><b>{p.name}</b><span>{p.sku}</span></div></div></td><td><span className="brand-name">{p.brand}</span></td><td><b className={p.stock <= 0 ? 'stock-zero' : ''}>{p.stock}</b><span className="unit-label"> unit</span></td><td><span className={'status-badge ' + (p.status === 'Menipis' ? 'status-low' : 'status-out')}><i />{p.status}</span></td></tr>)}
                {attentionProducts.length === 0 && <tr><td colSpan={4} className="empty-state">Tidak ada barang yang perlu perhatian.</td></tr>}
              </tbody></table></div>
              <div className="table-footer"><span>Menampilkan <b>{attentionProducts.length}</b> barang prioritas</span><span>● Diperbarui dari Supabase</span></div>
            </article>
          </section>}
          {activeNav !== 'Dashboard' && <section className="panel inventory-panel"><div className="inventory-heading"><div><h2>Daftar barang</h2><p>{loading ? 'Memuat data dari Supabase...' : 'Data barang dari database StokFlow'}</p></div><button className="text-action" onClick={() => loadData()}>Muat ulang <ArrowUpRight size={15} /></button></div><div className="table-tools"><div className="search-field"><Search size={17} /><input placeholder="Cari nama barang, SKU, atau brand..." value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}</div><button className="filter-button" onClick={() => setNotice('Filter lanjutan kita aktifkan pada tahap berikutnya.')}><SlidersHorizontal size={16} /> Filter</button></div><div className="table-scroll"><table><thead><tr><th>BARANG</th><th>BRAND</th><th>KATEGORI</th><th>STOK</th><th>HARGA / UNIT</th><th>STATUS</th><th></th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="product-cell"><div className="product-icon"><Package size={18} /></div><div><b>{p.name}</b><span>{p.sku}</span></div></div></td><td><span className="brand-name">{p.brand}</span></td><td className="muted-cell">{p.category}</td><td><b className={p.stock <= 0 ? 'stock-zero' : ''}>{p.stock}</b><span className="unit-label"> unit</span></td><td className="price-cell">{p.price ? rupiah(p.price) : 'Belum diatur'}</td><td><span className={'status-badge ' + (p.status === 'Aman' ? 'status-safe' : p.status === 'Menipis' ? 'status-low' : 'status-out')}><i />{p.status}</span></td><td><button className="row-more"><MoreHorizontal size={18} /></button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7} className="empty-state">Tidak ada barang yang cocok.</td></tr>}</tbody></table></div><div className="table-footer"><span>Menampilkan <b>{filtered.length}</b> dari <b>{products.length}</b> barang</span><span>● Data live dari Supabase</span></div></section>}
          <footer className="page-footer"><span>© 2026 StokFlow <span>·</span> Inventory made clearer.</span><span><i /> Database aktif</span></footer>
        </div>
      </main>
    </div>
  )
}
