import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, Bell, Boxes, ChevronDown, CircleHelp, Download, LayoutDashboard, Menu, MoreHorizontal, Package, Pencil, Plus, Search, Settings2, ShoppingCart, SlidersHorizontal, Sparkles, Trash2, TrendingUp, Truck, X } from 'lucide-react'

type Brand = { id: number; nama: string; target_bulanan: number }
type Product = { id: number; name: string; sku: string; brand: string; category: string; stock: number; openingStock: number; price: number; status: 'Aman' | 'Menipis' | 'Habis' }
type Tx = { id: number; barang_id: number; type: string; qty: number; tanggal?: string; penjualan_id?: number | null }
type Sale = { id: number; brand: string | null; qty: number | null; harga: number; tanggal_pembelian: string; barang_id: number | null }

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
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
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
  const [sales, setSales] = useState<Sale[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [targetDrafts, setTargetDrafts] = useState<Record<number, string>>({})
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
  const [saleProductId, setSaleProductId] = useState('')
  const [saleQty, setSaleQty] = useState('1')
  const [salePrice, setSalePrice] = useState('0')
  const [saleDate, setSaleDate] = useState(todayLocal())
  const [incomingProductId, setIncomingProductId] = useState('')
  const [incomingQty, setIncomingQty] = useState('1')
  const [incomingDate, setIncomingDate] = useState(todayLocal())
  const [savingTransaction, setSavingTransaction] = useState(false)
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null)
  const [editSaleQty, setEditSaleQty] = useState('1')
  const [editSalePrice, setEditSalePrice] = useState('0')
  const [editSaleBrand, setEditSaleBrand] = useState('')
  const [editSaleDate, setEditSaleDate] = useState(todayLocal())

  async function loadData(currentToken = token) {
    setLoading(true)
    try {
      const [rawBarang, rawBrand, rawTx, rawSales] = await Promise.all([
        apiAll('/rest/v1/barang?select=id,nama,stok_awal,brand_id,sku,kategori,harga&order=nama.asc', currentToken),
        apiAll('/rest/v1/brand?select=id,nama,target_bulanan&order=nama.asc', currentToken),
        apiAll('/rest/v1/transaksi?select=id,barang_id,type,qty,tanggal,penjualan_id&order=tanggal.desc', currentToken),
        apiAll('/rest/v1/penjualan?select=id,brand,qty,harga,tanggal_pembelian,barang_id&order=tanggal_pembelian.desc', currentToken),
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
          openingStock: Number(b.stok_awal || 0),
          price: Number(b.harga || 0),
          status: stock === 0 ? 'Habis' : stock <= 10 ? 'Menipis' : 'Aman',
        }
      })
      setBrands(brandList)
      setProducts(result)
      setTransactions(txList)
      setSales((rawSales || []).map((sale: any) => ({ ...sale, id: Number(sale.id), qty: Number(sale.qty || 0), harga: Number(sale.harga || 0), barang_id: sale.barang_id == null ? null : Number(sale.barang_id) })))
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

  async function saveBrandTarget(brand: Brand) {
    const target = Math.max(0, Number(targetDrafts[brand.id] ?? brand.target_bulanan) || 0)
    try {
      await api(`/rest/v1/brand?id=eq.${brand.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ target_bulanan: target }) }, token)
      setBrands(current => current.map(item => item.id === brand.id ? { ...item, target_bulanan: target } : item))
      setTargetDrafts(current => ({ ...current, [brand.id]: String(target) }))
      setNotice(`Target ${brand.nama} berhasil disimpan.`)
    } catch (e: any) {
      setNotice(`Target ${brand.nama} gagal disimpan: ${e.message}`)
    }
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

  function stockAtDate(productId: number, date: string) {
    const product = products.find(item => item.id === productId)
    if (!product) return null
    return product.openingStock + transactions.filter(t => t.barang_id === productId && t.tanggal && t.tanggal <= date).reduce((sum, t) => {
      if (t.type === 'masuk' || t.type === 'adjust_masuk') return sum + Number(t.qty || 0)
      if (t.type === 'laku' || t.type === 'adjust_keluar') return sum - Number(t.qty || 0)
      if (t.type === 'adjust') return sum + Number(t.qty || 0)
      return sum
    }, 0)
  }

  async function addSale() {
    const product = products.find(item => item.id === Number(saleProductId))
    const qty = Number(saleQty)
    const price = Number(salePrice)
    if (!product) { setNotice('Pilih barang yang akan dijual.'); return }
    if (!Number.isFinite(qty) || qty < 1) { setNotice('Jumlah penjualan minimal 1 unit.'); return }
    if (!Number.isFinite(price) || price < 0) { setNotice('Harga jual tidak boleh negatif.'); return }
    if (!saleDate) { setNotice('Tanggal penjualan wajib diisi.'); return }
    setSavingTransaction(true)
    try {
      await api('/rest/v1/rpc/catat_penjualan_atomic', {
        method: 'POST',
        body: JSON.stringify({ p_barang_id: product.id, p_brand: product.brand || 'Tanpa brand', p_qty: qty, p_harga: price, p_tanggal_pembelian: saleDate })
      }, token)
      await loadData(token)
      setSaleQty('1')
      setNotice('Penjualan tersimpan. Catatan penjualan dan pergerakan stok dicatat dalam satu transaksi database.')
    } catch (e: any) {
      setNotice('Penjualan gagal disimpan: ' + e.message)
    } finally { setSavingTransaction(false) }
  }

  function beginEditSale(sale: Sale) {
    setEditingSaleId(sale.id)
    setEditSaleQty(String(sale.qty || 1))
    setEditSalePrice(String(sale.harga || 0))
    setEditSaleBrand(sale.brand || 'Tanpa brand')
    setEditSaleDate(sale.tanggal_pembelian)
    setNotice('')
  }

  async function saveEditedSale() {
    const sale = sales.find(item => item.id === editingSaleId)
    const qty = Number(editSaleQty)
    const price = Number(editSalePrice)
    if (!sale) { setNotice('Data penjualan yang akan diedit tidak ditemukan. Muat ulang data.'); return }
    if (!Number.isInteger(qty) || qty < 1) { setNotice('Jumlah penjualan minimal 1 unit dan harus bilangan bulat.'); return }
    if (!Number.isFinite(price) || price < 0) { setNotice('Harga jual tidak boleh negatif.'); return }
    if (!editSaleBrand.trim()) { setNotice('Brand wajib diisi.'); return }
    if (!editSaleDate || editSaleDate > todayLocal()) { setNotice('Tanggal penjualan tidak valid.'); return }
    setSavingTransaction(true)
    try {
      await api('/rest/v1/rpc/edit_penjualan_atomic', {
        method: 'POST',
        body: JSON.stringify({ p_penjualan_id: sale.id, p_qty: qty, p_harga: price, p_brand: editSaleBrand.trim(), p_tanggal: editSaleDate })
      }, token)
      setEditingSaleId(null)
      await loadData(token)
      setNotice('Penjualan berhasil diperbarui. Catatan stok terkait diperbarui dalam transaksi database yang sama.')
    } catch (e: any) {
      setNotice('Edit penjualan gagal: ' + e.message)
    } finally { setSavingTransaction(false) }
  }

  async function deleteSale(sale: Sale) {
    const productName = products.find(p => p.id === sale.barang_id)?.name || 'barang'
    if (!window.confirm('Hapus penjualan ' + productName + ' tanggal ' + sale.tanggal_pembelian + '? Catatan stok terkait juga akan dihapus.')) return
    setSavingTransaction(true)
    try {
      await api('/rest/v1/rpc/hapus_penjualan_atomic', {
        method: 'POST',
        body: JSON.stringify({ p_penjualan_id: sale.id })
      }, token)
      if (editingSaleId === sale.id) setEditingSaleId(null)
      await loadData(token)
      setNotice('Penjualan dihapus dan catatan pengurangan stok terkait dibatalkan secara atomik.')
    } catch (e: any) {
      setNotice('Hapus penjualan gagal: ' + e.message)
    } finally { setSavingTransaction(false) }
  }

  async function addIncoming() {
    const product = products.find(item => item.id === Number(incomingProductId))
    const qty = Number(incomingQty)
    if (!product) { setNotice('Pilih barang yang akan masuk.'); return }
    if (!Number.isFinite(qty) || qty < 1) { setNotice('Jumlah barang masuk minimal 1 unit.'); return }
    if (!incomingDate) { setNotice('Tanggal barang masuk wajib diisi.'); return }
    const expectedStock = stockAtDate(product.id, incomingDate)
    if (expectedStock === null) { setNotice('Stok barang tidak dapat dihitung. Muat ulang data.'); return }
    setSavingTransaction(true)
    try {
      await api('/rest/v1/rpc/catat_transaksi_stok_atomic', {
        method: 'POST',
        body: JSON.stringify({ p_barang_id: product.id, p_tanggal: incomingDate, p_type: 'masuk', p_qty: qty, p_expected_stock: expectedStock })
      }, token)
      await loadData(token)
      setIncomingQty('1')
      setNotice('Barang masuk tersimpan dan stok diperbarui secara atomik.')
    } catch (e: any) {
      setNotice('Barang masuk gagal disimpan: ' + e.message)
    } finally { setSavingTransaction(false) }
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
  const monthSales = sales.filter(sale => {
    if (!sale.tanggal_pembelian) return false
    const date = new Date(sale.tanggal_pembelian + 'T00:00:00')
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  })
  const brandMonthlySales = brands.map(brand => {
    const sold = monthSales.filter(sale => (sale.brand || '').trim().toLowerCase() === brand.nama.trim().toLowerCase()).reduce((sum, sale) => sum + Number(sale.qty || 0) * Number(sale.harga || 0), 0)
    const target = Math.max(0, Number(targetDrafts[brand.id] ?? brand.target_bulanan) || 0)
    return { ...brand, sold, target, progress: target > 0 ? Math.min(100, sold / target * 100) : 0 }
  }).sort((a, b) => b.sold - a.sold)

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
          {activeNav === 'Dashboard' && <section className="dashboard-overview">
            <div className="metric-grid">
              <article className="metric-card"><div className="metric-top"><span>Total jenis barang</span><div className="metric-icon purple"><Package size={19} /></div></div><div className="metric-value">{products.length.toLocaleString('id-ID')}<small> SKU</small></div><div className="metric-foot"><span className="foot-neutral">{activeBrands.toLocaleString('id-ID')} brand terdaftar</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Total unit tersedia</span><div className="metric-icon blue"><Boxes size={19} /></div></div><div className="metric-value">{totalStock.toLocaleString('id-ID')}<small> unit</small></div><div className="metric-foot"><span className="foot-neutral">Akumulasi stok saat ini</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Nilai estimasi stok</span><div className="metric-icon purple"><TrendingUp size={19} /></div></div><div className="metric-value" style={{fontSize: inventoryValue >= 1000000000 ? 20 : 23}}>{rupiah(inventoryValue)}</div><div className="metric-foot"><span className="foot-neutral">Berdasarkan harga per unit</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Perlu pengadaan</span><div className="metric-icon red"><Bell size={19} /></div></div><div className="metric-value">{(lowStock + outStock).toLocaleString('id-ID')}<small> SKU</small></div><div className="metric-foot"><span className={outStock ? 'foot-danger' : 'foot-warning'}>{outStock.toLocaleString('id-ID')} habis, {lowStock.toLocaleString('id-ID')} menipis</span></div></article>
            </div>
            <article className="panel brand-target-panel">
              <div className="panel-heading"><div><h2>Brand &amp; target penjualan</h2><p>Realisasi omzet bulan ini dibanding target Rupiah</p></div><span className="demo-pill">{brands.length} BRAND</span></div><p className="brand-target-note">Omzet dihitung dari jumlah terjual × harga yang tercatat pada transaksi penjualan.</p>
              <div className="brand-target-grid">{brandMonthlySales.map(brand => <div className="brand-target-item" key={brand.id}>
                <div className="brand-target-top"><b>{brand.nama}</b><span>{rupiah(brand.sold)} / {rupiah(brand.target)}</span></div>
                <div className="brand-target-track"><div style={{ width: brand.progress + '%' }} /></div>
                <div className="brand-target-bottom"><span>{brand.target > 0 ? Math.round(brand.sold / brand.target * 100) + '% tercapai' : 'Target belum diisi'}</span><div className="brand-target-edit"><input aria-label={'Target penjualan bulanan dalam Rupiah untuk ' + brand.nama} type="number" min="0" step="1000" value={targetDrafts[brand.id] ?? String(brand.target_bulanan || 0)} onChange={e => setTargetDrafts(current => ({ ...current, [brand.id]: e.target.value }))} /><button onClick={() => saveBrandTarget(brand)}>Simpan</button></div></div>
              </div>)}</div>
            </article>
            <div className="chart-grid dashboard-stats-grid">
              <article className="panel activity-panel">
                <div className="panel-heading"><div><h2>Aktivitas inventaris</h2><p>Pergerakan barang selama 7 hari terakhir</p></div><span className="demo-pill">7 HARI</span></div>
                <div className="dashboard-trend-legend"><span><i className="sold-key" /> Barang terjual</span><span><i className="incoming-key" /> Barang masuk</span></div>
                <div className="dashboard-bars">{lastSevenDays.map(day => <div className="dashboard-bar-day" key={day.key}><div className="dashboard-bar-pair"><div title={'Terjual: ' + day.sold} className="dashboard-bar sold-bar" style={{height: Math.max(day.sold ? 5 : 2, day.sold / trendMax * 100) + '%'}} /><div title={'Masuk: ' + day.incoming} className="dashboard-bar incoming-bar" style={{height: Math.max(day.incoming ? 5 : 2, day.incoming / trendMax * 100) + '%'}} /></div><span>{day.label}</span></div>)}</div>
                <div className="dashboard-chart-summary"><div><span>Terjual bulan ini</span><b>{soldThisMonth.toLocaleString('id-ID')} unit</b></div><div><span>Barang masuk bulan ini</span><b>{incomingThisMonth.toLocaleString('id-ID')} unit</b></div></div>
              </article>
              <article className="panel activity-panel dashboard-health-panel">
                <div className="panel-heading"><div><h2>Kesehatan stok</h2><p>Proporsi kondisi barang saat ini</p></div></div>
                <div className="dashboard-health-score"><div className="dashboard-health-ring" style={{background: 'conic-gradient(#29b783 0 ' + (products.length ? safeStock / products.length * 100 : 0) + '%, #e6a43c ' + (products.length ? safeStock / products.length * 100 : 0) + '% ' + (products.length ? (safeStock + lowStock) / products.length * 100 : 0) + '%, #e27676 ' + (products.length ? (safeStock + lowStock) / products.length * 100 : 0) + '% 100%)'}}><div><b>{products.length ? Math.round(safeStock / products.length * 100) : 0}%</b><span>stok aman</span></div></div></div>
                <div className="dashboard-health-legend"><div><span><i className="health-safe" /> Aman</span><b>{safeStock.toLocaleString('id-ID')}</b></div><div><span><i className="health-low" /> Menipis</span><b>{lowStock.toLocaleString('id-ID')}</b></div><div><span><i className="health-out" /> Habis</span><b>{outStock.toLocaleString('id-ID')}</b></div></div>
              </article>
            </div>
            <div className="dashboard-bottom-grid">
              <article className="panel dashboard-insight"><div className="dashboard-insight-icon blue"><ArrowDownLeft size={19}/></div><div><span>Barang masuk bulan ini</span><b>{incomingThisMonth.toLocaleString('id-ID')} unit</b><p>Total kuantitas transaksi masuk pada bulan berjalan.</p></div></article>
              <article className="panel dashboard-insight"><div className="dashboard-insight-icon purple"><ShoppingCart size={19}/></div><div><span>Barang terjual bulan ini</span><b>{soldThisMonth.toLocaleString('id-ID')} unit</b><p>Total kuantitas penjualan bulan berjalan.</p></div></article>
              <article className="panel dashboard-insight"><div className="dashboard-insight-icon amber"><Activity size={19}/></div><div><span>Transaksi bulan ini</span><b>{recentActivityCount.toLocaleString('id-ID')}</b><p>Jumlah catatan pergerakan barang bulan berjalan.</p></div></article>
            </div>
            <div className="dashboard-note"><Sparkles size={16}/><span>Ringkasan dari Supabase saat data dimuat. Halaman <b>Barang &amp; Stok</b> khusus untuk pencarian dan tabel barang.</span><button onClick={() => loadData()} disabled={loading}>{loading ? 'Memuat...' : 'Perbarui data'}</button></div>
          </section>}
          {activeNav === 'Penjualan' && <section className="panel inventory-panel" style={{ padding: 20 }}>
            <div className="inventory-heading"><div><h2>Catat penjualan</h2><p>Penjualan dan pengurangan stok tersimpan bersama dalam satu transaksi database.</p></div><span className="demo-pill">{sales.length.toLocaleString('id-ID')} DATA</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, margin: '18px 0 24px' }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Barang
                <select value={saleProductId} onChange={e => { const id = e.target.value; setSaleProductId(id); const item = products.find(p => p.id === Number(id)); if (item) setSalePrice(String(item.price)) }} style={{ minWidth: 0, padding: 11, border: '1px solid #dfe2eb', borderRadius: 9, background: '#fff' }}>
                  <option value="">Pilih barang</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · {p.brand}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Jumlah (unit)
                <input type="number" min="1" step="1" value={saleQty} onChange={e => setSaleQty(e.target.value)} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Harga jual per unit (Rp)
                <input type="number" min="0" step="100" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Tanggal penjualan
                <input type="date" value={saleDate} max={todayLocal()} onChange={e => setSaleDate(e.target.value)} />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'end', gap: 7 }}><span style={{ color: '#747b8d', fontSize: 12 }}>Total penjualan</span><b style={{ fontSize: 18 }}>{rupiah(Math.max(0, Number(saleQty) || 0) * Math.max(0, Number(salePrice) || 0))}</b><button className="button-primary" disabled={savingTransaction || loading} onClick={addSale}>{savingTransaction ? 'Menyimpan...' : 'Simpan penjualan'}</button></div>
            </div>
            {editingSaleId !== null && <div className="panel" style={{ padding: 16, margin: '8px 0 20px', border: '1px solid #dfe2eb' }}>
              <div className="inventory-heading"><div><h2>Edit penjualan #{editingSaleId}</h2><p>Barang tetap, perubahan jumlah dan tanggal akan memperbarui transaksi stok terkait.</p></div><button className="text-action" onClick={() => setEditingSaleId(null)} disabled={savingTransaction}>Batal <X size={15} /></button></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Brand<input value={editSaleBrand} onChange={e => setEditSaleBrand(e.target.value)} maxLength={120} /></label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Jumlah (unit)<input type="number" min="1" step="1" value={editSaleQty} onChange={e => setEditSaleQty(e.target.value)} /></label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Harga / unit (Rp)<input type="number" min="0" step="100" value={editSalePrice} onChange={e => setEditSalePrice(e.target.value)} /></label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Tanggal<input type="date" value={editSaleDate} max={todayLocal()} onChange={e => setEditSaleDate(e.target.value)} /></label>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'end', gap: 7 }}><b style={{ fontSize: 16 }}>{rupiah(Math.max(0, Number(editSaleQty) || 0) * Math.max(0, Number(editSalePrice) || 0))}</b><button className="button-primary" disabled={savingTransaction || loading} onClick={saveEditedSale}>{savingTransaction ? 'Menyimpan...' : 'Simpan perubahan'}</button></div>
              </div>
            </div>}
            <div className="inventory-heading"><div><h2>Riwayat penjualan</h2><p>20 catatan terbaru, harga menggunakan nilai transaksi tersimpan.</p></div><button className="text-action" onClick={() => loadData()} disabled={loading}>Muat ulang <ArrowUpRight size={15} /></button></div>
            <div className="table-scroll"><table><thead><tr><th>TANGGAL</th><th>BARANG</th><th>BRAND</th><th>QTY</th><th>HARGA / UNIT</th><th>TOTAL</th><th>AKSI</th></tr></thead><tbody>{[...sales].sort((a,b) => b.tanggal_pembelian.localeCompare(a.tanggal_pembelian) || b.id-a.id).slice(0,20).map(sale => <tr key={sale.id}><td>{new Date(sale.tanggal_pembelian + 'T00:00:00').toLocaleDateString('id-ID')}</td><td>{products.find(p => p.id === sale.barang_id)?.name || 'Barang tidak ditemukan'}</td><td>{sale.brand || 'Tanpa brand'}</td><td>{Number(sale.qty || 0).toLocaleString('id-ID')}</td><td>{rupiah(sale.harga)}</td><td className="price-cell">{rupiah(Number(sale.qty || 0) * sale.harga)}</td><td><div style={{ display: 'flex', gap: 6 }}><button className="text-action" title="Edit penjualan" disabled={savingTransaction} onClick={() => beginEditSale(sale)}><Pencil size={15} /></button><button className="text-action" title="Hapus penjualan" disabled={savingTransaction} onClick={() => deleteSale(sale)} style={{ color: '#c43d4b' }}><Trash2 size={15} /></button></div></td></tr>)}{sales.length === 0 && <tr><td colSpan={7} className="empty-state">Belum ada data penjualan.</td></tr>}</tbody></table></div>
          </section>}

          {activeNav === 'Barang Masuk' && <section className="panel inventory-panel" style={{ padding: 20 }}>
            <div className="inventory-heading"><div><h2>Catat barang masuk</h2><p>Pergerakan stok divalidasi database sebelum disimpan.</p></div><span className="demo-pill">{transactions.filter(t => t.type === 'masuk' || t.type === 'adjust_masuk').length.toLocaleString('id-ID')} DATA</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, margin: '18px 0 24px' }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Barang
                <select value={incomingProductId} onChange={e => setIncomingProductId(e.target.value)} style={{ minWidth: 0, padding: 11, border: '1px solid #dfe2eb', borderRadius: 9, background: '#fff' }}>
                  <option value="">Pilih barang</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · stok {p.stock}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Jumlah masuk (unit)
                <input type="number" min="1" step="1" value={incomingQty} onChange={e => setIncomingQty(e.target.value)} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Tanggal barang masuk
                <input type="date" value={incomingDate} max={todayLocal()} onChange={e => setIncomingDate(e.target.value)} />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'end', gap: 7 }}><span style={{ color: '#747b8d', fontSize: 12 }}>Stok barang pada tanggal tersebut</span><b style={{ fontSize: 18 }}>{incomingProductId && stockAtDate(Number(incomingProductId), incomingDate) !== null ? Number(stockAtDate(Number(incomingProductId), incomingDate)).toLocaleString('id-ID') + ' unit' : 'Pilih barang'}</b><button className="button-primary" disabled={savingTransaction || loading} onClick={addIncoming}>{savingTransaction ? 'Menyimpan...' : 'Simpan barang masuk'}</button></div>
            </div>
            <div className="inventory-heading"><div><h2>Riwayat barang masuk</h2><p>20 catatan terbaru dari buku transaksi stok.</p></div><button className="text-action" onClick={() => loadData()} disabled={loading}>Muat ulang <ArrowUpRight size={15} /></button></div>
            <div className="table-scroll"><table><thead><tr><th>TANGGAL</th><th>BARANG</th><th>JUMLAH MASUK</th><th>STOK SAAT INI</th></tr></thead><tbody>{transactions.filter(t => t.type === 'masuk' || t.type === 'adjust_masuk').sort((a,b) => (b.tanggal || '').localeCompare(a.tanggal || '') || b.id-a.id).slice(0,20).map(tx => <tr key={tx.id}><td>{tx.tanggal ? new Date(tx.tanggal + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</td><td>{products.find(p => p.id === tx.barang_id)?.name || 'Barang tidak ditemukan'}</td><td>{Number(tx.qty || 0).toLocaleString('id-ID')} unit</td><td>{(products.find(p => p.id === tx.barang_id)?.stock ?? 0).toLocaleString('id-ID')} unit</td></tr>)}{transactions.filter(t => t.type === 'masuk' || t.type === 'adjust_masuk').length === 0 && <tr><td colSpan={4} className="empty-state">Belum ada data barang masuk.</td></tr>}</tbody></table></div>
          </section>}

          {(activeNav === 'Barang & Stok' || activeNav === 'Laporan') && <section className="panel inventory-panel"><div className="inventory-heading"><div><h2>Daftar barang</h2><p>{loading ? 'Memuat data dari Supabase...' : 'Data barang dari database StokFlow'}</p></div><button className="text-action" onClick={() => loadData()}>Muat ulang <ArrowUpRight size={15} /></button></div><div className="table-tools"><div className="search-field"><Search size={17} /><input placeholder="Cari nama barang, SKU, atau brand..." value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}</div><button className="filter-button" onClick={() => setNotice('Filter lanjutan kita aktifkan pada tahap berikutnya.')}><SlidersHorizontal size={16} /> Filter</button></div><div className="table-scroll"><table><thead><tr><th>BARANG</th><th>BRAND</th><th>KATEGORI</th><th>STOK</th><th>HARGA / UNIT</th><th>STATUS</th><th></th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="product-cell"><div className="product-icon"><Package size={18} /></div><div><b>{p.name}</b><span>{p.sku}</span></div></div></td><td><span className="brand-name">{p.brand}</span></td><td className="muted-cell">{p.category}</td><td><b className={p.stock <= 0 ? 'stock-zero' : ''}>{p.stock}</b><span className="unit-label"> unit</span></td><td className="price-cell">{p.price ? rupiah(p.price) : 'Belum diatur'}</td><td><span className={'status-badge ' + (p.status === 'Aman' ? 'status-safe' : p.status === 'Menipis' ? 'status-low' : 'status-out')}><i />{p.status}</span></td><td><button className="row-more"><MoreHorizontal size={18} /></button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7} className="empty-state">Tidak ada barang yang cocok.</td></tr>}</tbody></table></div><div className="table-footer"><span>Menampilkan <b>{filtered.length}</b> dari <b>{products.length}</b> barang</span><span>● Data live dari Supabase</span></div></section>}
          <footer className="page-footer"><span>© 2026 StokFlow <span>·</span> Inventory made clearer.</span><span><i /> Database aktif</span></footer>
        </div>
      </main>
    </div>
  )
}
