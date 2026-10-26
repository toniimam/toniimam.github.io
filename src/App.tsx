import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Bell, Boxes, LayoutDashboard, LogOut, MoreHorizontal, Package, Pencil, Search, ShoppingCart, SlidersHorizontal, Sparkles, Trash2, TrendingUp, Truck, X } from 'lucide-react'

type Brand = { id: number; nama: string; target_bulanan: number }
type Product = { id: number; name: string; sku: string; brand: string; category: string; stock: number; openingStock: number; startDate: string; price: number; status: 'Aman' | 'Menipis' | 'Habis' }
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
const firstDayOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Barang & Stok', icon: Boxes },
  { label: 'Penjualan', icon: ShoppingCart },
  { label: 'Barang Masuk', icon: Truck },
  { label: 'Penyesuaian Stok', icon: SlidersHorizontal },
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
  const [dashboardSalesRange, setDashboardSalesRange] = useState<7 | 30>(7)
  const [expandedBrandTarget, setExpandedBrandTarget] = useState<number | null>(null)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [saleProductId, setSaleProductId] = useState('')
  const [saleQty, setSaleQty] = useState('1')
  const [salePrice, setSalePrice] = useState('0')
  const [saleDate, setSaleDate] = useState(todayLocal())
  const [incomingProductId, setIncomingProductId] = useState('')
  const [incomingSearch, setIncomingSearch] = useState('')
  const [incomingQty, setIncomingQty] = useState('1')
  const [incomingDate, setIncomingDate] = useState(todayLocal())
  const [adjustProductId, setAdjustProductId] = useState('')
  const [adjustStock, setAdjustStock] = useState('0')
  const [adjustDate, setAdjustDate] = useState(todayLocal())
  const [savingTransaction, setSavingTransaction] = useState(false)
  const [inventoryPage, setInventoryPage] = useState(1)
  const [salesPage, setSalesPage] = useState(1)
  const [incomingPage, setIncomingPage] = useState(1)
  const [reportStartDate, setReportStartDate] = useState(firstDayOfMonth())
  const [reportEndDate, setReportEndDate] = useState(todayLocal())
  const [reportBrand, setReportBrand] = useState('all')
  const [reportPage, setReportPage] = useState(1)
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null)
  const [editSaleQty, setEditSaleQty] = useState('1')
  const [editSalePrice, setEditSalePrice] = useState('0')
  const [editSaleBrand, setEditSaleBrand] = useState('')
  const [editSaleDate, setEditSaleDate] = useState(todayLocal())

  async function loadData(currentToken = token) {
    setLoading(true)
    try {
      const [rawBarang, rawBrand, rawTx, rawSales] = await Promise.all([
        apiAll('/rest/v1/barang?select=id,nama,stok_awal,tanggal_mulai,created_at,brand_id,sku,kategori,harga&order=nama.asc', currentToken),
        apiAll('/rest/v1/brand?select=id,nama,target_bulanan&order=nama.asc', currentToken),
        apiAll('/rest/v1/transaksi?select=id,barang_id,type,qty,tanggal,penjualan_id&order=tanggal.desc', currentToken),
        apiAll('/rest/v1/penjualan?select=id,brand,qty,harga,tanggal_pembelian,barang_id&order=tanggal_pembelian.desc', currentToken),
      ])
      const brandList: Brand[] = rawBrand || []
      const txList: Tx[] = rawTx || []
      const result: Product[] = (rawBarang || []).map((b: any) => {
        const startDate = b.tanggal_mulai || (b.created_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(b.created_at)) : '')
        const openingStock = startDate ? (startDate <= todayLocal() ? Number(b.stok_awal || 0) : 0) : Number(b.stok_awal || 0)
        const movement = txList.filter(t => t.barang_id === b.id && t.tanggal && t.tanggal <= todayLocal() && (!startDate || t.tanggal >= startDate)).reduce((sum, t) => {
          if (t.type === 'masuk' || t.type === 'adjust_masuk') return sum + Number(t.qty)
          if (t.type === 'laku' || t.type === 'adjust_keluar') return sum - Number(t.qty)
          if (t.type === 'adjust') return sum + Number(t.qty)
          return sum
        }, 0)
        const stock = openingStock + movement
        return {
          id: b.id,
          name: b.nama,
          sku: b.sku || `STK-${b.id}`,
          brand: brandList.find(x => x.id === b.brand_id)?.nama || 'Tanpa brand',
          category: b.kategori || 'Belum dikategorikan',
          stock,
          openingStock: Number(b.stok_awal || 0),
          startDate,
          price: Number(b.harga || 0),
          status: stock === 0 ? 'Habis' : stock <= 10 ? 'Menipis' : 'Aman',
        }
      })
      setBrands(brandList)
      setProducts(result)
      setTransactions(txList)
      setSales((rawSales || []).map((sale: any) => ({ ...sale, id: Number(sale.id), qty: Number(sale.qty || 0), harga: Number(sale.harga || 0), barang_id: sale.barang_id == null ? null : Number(sale.barang_id) })))
      setNotice('Terhubung ke database StokFlow.')
    } catch (e: any) {
      setNotice(`Gagal memuat data: ${e.message}`)
    } finally { setLoading(false) }
  }

  async function verifySession(currentToken: string, currentEmail: string) {
    try {
      await api(`/rest/v1/app_admins?select=email&limit=1`, {}, currentToken)
      setToken(currentToken); setEmail(currentEmail); await loadData(currentToken)
    } catch {
      localStorage.removeItem('stokflow_token'); localStorage.removeItem('stokflow_email'); setToken(''); setEmail(''); clearAppData()
    }
  }

  useEffect(() => { if (token && email) verifySession(token, email) }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timeout)
  }, [notice])

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


  function stockAtDate(productId: number, date: string) {
    const product = products.find(item => item.id === productId)
    if (!product) return null
    const openingStock = !product.startDate || product.startDate <= date ? product.openingStock : 0
    return openingStock + transactions.filter(t => t.barang_id === productId && t.tanggal && t.tanggal <= date && (!product.startDate || t.tanggal >= product.startDate)).reduce((sum, t) => {
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

  async function saveStockAdjustment() {
    const product = products.find(item => item.id === Number(adjustProductId))
    const targetStock = Number(adjustStock)
    if (!product) { setNotice('Pilih barang yang akan disesuaikan.'); return }
    if (!Number.isFinite(targetStock)) { setNotice('Stok fisik harus berupa angka yang valid.'); return }
    if (!adjustDate || adjustDate > todayLocal()) { setNotice('Tanggal penyesuaian tidak valid.'); return }
    if (product.startDate && adjustDate < product.startDate) { setNotice('Tanggal penyesuaian tidak boleh sebelum tanggal mulai pencatatan barang.'); return }
    const expectedStock = stockAtDate(product.id, adjustDate)
    if (expectedStock === null) { setNotice('Stok pada tanggal tersebut tidak dapat dihitung.'); return }
    if (targetStock === expectedStock) { setNotice('Stok fisik sama dengan catatan sistem, tidak ada penyesuaian.'); return }
    setSavingTransaction(true)
    try {
      await api('/rest/v1/rpc/catat_transaksi_stok_atomic', {
        method: 'POST',
        body: JSON.stringify({ p_barang_id: product.id, p_tanggal: adjustDate, p_type: 'adjust', p_qty: targetStock, p_expected_stock: expectedStock })
      }, token)
      await loadData(token)
      setAdjustStock(String(targetStock))
      setNotice('Penyesuaian stok tersimpan. Selisih dicatat di buku transaksi tanpa mengubah skema database.')
    } catch (e: any) {
      setNotice('Penyesuaian stok gagal disimpan: ' + e.message)
    } finally { setSavingTransaction(false) }
  }

  function clearAppData() {
    setProducts([]); setTransactions([]); setSales([]); setBrands([]); setTargetDrafts({})
    setEditingSaleId(null); setInventoryPage(1); setSalesPage(1); setIncomingPage(1); setReportPage(1)
  }

  function logout() { localStorage.removeItem('stokflow_token'); localStorage.removeItem('stokflow_email'); setToken(''); setEmail(''); clearAppData() }
  const filtered = useMemo(() => products.filter(p => [p.name, p.sku, p.brand, p.category].some(v => v.toLowerCase().includes(query.toLowerCase()))), [products, query])
  const pageSize = 7
  const sortedSales = useMemo(() => [...sales].sort((a,b) => b.tanggal_pembelian.localeCompare(a.tanggal_pembelian) || b.id-a.id), [sales])
  const incomingTransactions = useMemo(() => transactions.filter(t => t.type === 'masuk' || t.type === 'adjust_masuk').sort((a,b) => (b.tanggal || '').localeCompare(a.tanggal || '') || b.id-a.id), [transactions])
  const incomingSearchResults = useMemo(() => {
    const q = incomingSearch.trim().toLowerCase()
    if (q.length < 2) return []
    return products.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)).slice(0, 8)
  }, [products, incomingSearch])
  const inventoryPageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const salesPageCount = Math.max(1, Math.ceil(sortedSales.length / pageSize))
  const incomingPageCount = Math.max(1, Math.ceil(incomingTransactions.length / pageSize))
  const reportSales = useMemo(() => sortedSales.filter(sale => (!reportStartDate || sale.tanggal_pembelian >= reportStartDate) && (!reportEndDate || sale.tanggal_pembelian <= reportEndDate) && (reportBrand === 'all' || (sale.brand || 'Tanpa brand') === reportBrand)), [sortedSales, reportStartDate, reportEndDate, reportBrand])
  const reportByBrand = useMemo(() => {
    const totals = new Map<string, { brand: string; transactions: number; qty: number; revenue: number }>()
    for (const sale of reportSales) {
      const brand = sale.brand || 'Tanpa brand'
      const row = totals.get(brand) || { brand, transactions: 0, qty: 0, revenue: 0 }
      row.transactions += 1
      row.qty += Number(sale.qty || 0)
      row.revenue += Number(sale.qty || 0) * Number(sale.harga || 0)
      totals.set(brand, row)
    }
    return [...totals.values()].sort((a, b) => b.revenue - a.revenue)
  }, [reportSales])
  const reportRevenue = reportSales.reduce((sum, sale) => sum + Number(sale.qty || 0) * Number(sale.harga || 0), 0)
  const reportQty = reportSales.reduce((sum, sale) => sum + Number(sale.qty || 0), 0)
  const reportPageCount = Math.max(1, Math.ceil(reportSales.length / pageSize))
  const visibleReportSales = reportSales.slice((reportPage - 1) * pageSize, reportPage * pageSize)
  const visibleProducts = filtered.slice((inventoryPage - 1) * pageSize, inventoryPage * pageSize)
  const visibleSales = sortedSales.slice((salesPage - 1) * pageSize, salesPage * pageSize)
  const visibleIncoming = incomingTransactions.slice((incomingPage - 1) * pageSize, incomingPage * pageSize)
  useEffect(() => { if (inventoryPage > inventoryPageCount) setInventoryPage(inventoryPageCount) }, [inventoryPage, inventoryPageCount])
  useEffect(() => { if (salesPage > salesPageCount) setSalesPage(salesPageCount) }, [salesPage, salesPageCount])
  useEffect(() => { if (incomingPage > incomingPageCount) setIncomingPage(incomingPageCount) }, [incomingPage, incomingPageCount])
  useEffect(() => { if (reportPage > reportPageCount) setReportPage(reportPageCount) }, [reportPage, reportPageCount])
  function pagination(label: string, total: number, page: number, pages: number, changePage: (page: number) => void) {
    const first = total === 0 ? 0 : (page - 1) * pageSize + 1
    const last = Math.min(page * pageSize, total)
    return <div className="table-pagination">
      <span>Menampilkan <b>{first}-{last}</b> dari <b>{total.toLocaleString('id-ID')}</b> {label}</span>
      <div className="pagination-controls">
        <button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1}>Sebelumnya</button>
        <span>Halaman <b>{page}</b> dari <b>{pages}</b></span>
        <button type="button" onClick={() => changePage(Math.min(pages, page + 1))} disabled={page >= pages}>Berikutnya</button>
      </div>
    </div>
  }
  const now = new Date()
  const activeBrands = new Set(products.map(p => p.brand).filter(b => b !== 'Tanpa brand')).size
  const totalStockUnits = products.reduce((sum, p) => sum + Math.max(0, Number(p.stock || 0)), 0)
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
  const dashboardSalesDays = Array.from({ length: dashboardSalesRange }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dashboardSalesRange - 1 - index))
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
    const daySales = sales.filter(sale => sale.tanggal_pembelian === key)
    return { key, label: dashboardSalesRange === 7 ? date.toLocaleDateString('id-ID', { weekday: 'short' }) : String(date.getDate()), sold: daySales.reduce((sum, sale) => sum + Number(sale.qty || 0), 0) }
  })
  const dashboardSalesMax = Math.max(1, ...dashboardSalesDays.map(d => d.sold))

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
      <main className="main-area">
        <header className="topbar">
          <div className="brand-lockup"><div className="brand-mark"><Boxes size={22} /></div><div><strong>stokflow</strong><span>INVENTORY SYSTEM</span></div></div>
          <div className="top-actions"><button className="icon-button" title="Status database" onClick={() => setNotice('Terhubung ke database StokFlow.')}><Bell size={19} /></button><div className="top-avatar" title={email}>{email.slice(0, 2).toUpperCase()}</div><button className="logout-button" onClick={logout}><LogOut size={16} /><span>Keluar</span></button></div>
        </header>
        <nav className="desktop-nav" aria-label="Navigasi utama">{navItems.map(item => { const Icon = item.icon; return <button key={item.label} className={'nav-item ' + (activeNav === item.label ? 'nav-active' : '')} onClick={() => setActiveNav(item.label)}><Icon size={17} /><span>{item.label}</span>{item.label === 'Barang & Stok' && <span className="nav-count">{products.length}</span>}</button> })}</nav>
        <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><Sparkles size={14} /> DATABASE STOKFLOW</div><h1>{activeNav}</h1><p>Ringkasan stok dan penjualan untuk memantau performa toko.</p></div></div>
          {notice && <div className="toast" role="status"><span className="toast-check">✓</span><span>{notice}</span><button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}><X size={15} /></button></div>}
          {activeNav === 'Dashboard' && <section className="dashboard-overview">
  <div className="metric-grid">
    <article className="metric-card"><div className="metric-top"><span>Total jenis barang</span><div className="metric-icon purple"><Package size={19} /></div></div><div className="metric-value">{products.length.toLocaleString('id-ID')}<small> SKU</small></div><div className="metric-foot"><span className="foot-neutral">{activeBrands.toLocaleString('id-ID')} brand terdaftar</span></div></article>
    <article className="metric-card"><div className="metric-top"><span>Barang stok minus</span><div className="metric-icon blue"><Boxes size={19} /></div></div><div className="metric-value">{products.filter(p => p.stock < 0).length.toLocaleString('id-ID')}<small> SKU</small></div><div className="metric-foot"><span className="foot-neutral">Saldo negatif, termasuk barang PO</span></div></article>
    <article className="metric-card"><div className="metric-top"><span>Total barang</span><div className="metric-icon purple"><Package size={19} /></div></div><div className="metric-value">{totalStockUnits.toLocaleString('id-ID')}<small> unit</small></div><div className="metric-foot"><span className="foot-neutral">Jumlah unit stok tersedia saat ini</span></div></article>
  </div>
  <article className="panel activity-panel dashboard-sales-panel">
    <div className="panel-heading"><div><h2>Statistik penjualan</h2><p>Jumlah unit terjual per hari.</p></div><div className="dashboard-range-toggle"><button className={dashboardSalesRange === 7 ? 'active' : ''} onClick={() => setDashboardSalesRange(7)}>7 hari</button><button className={dashboardSalesRange === 30 ? 'active' : ''} onClick={() => setDashboardSalesRange(30)}>30 hari</button></div></div>
    <div className="dashboard-sales-summary"><div><span>Total unit terjual</span><b>{dashboardSalesDays.reduce((sum, d) => sum + d.sold, 0).toLocaleString('id-ID')} unit</b></div></div>
    <div className="dashboard-sales-chart">
      <div className="dashboard-sales-axis">{[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => <span key={index}>{Math.round(dashboardSalesMax * ratio).toLocaleString('id-ID')}</span>)}</div>
      <div className={'dashboard-sales-bars sales-days-' + dashboardSalesRange}>{dashboardSalesDays.map(day => { const value = day.sold; return <div className="dashboard-sales-day" key={day.key}><div className="dashboard-sales-bar-wrap"><div title={value + ' unit terjual'} className="dashboard-sales-bar" style={{height: Math.max(value ? 5 : 2, value / dashboardSalesMax * 100) + '%'}} /></div><span>{day.label}</span></div> })}</div>
    </div>
  </article>
  <article className="panel brand-target-panel">
    <div className="panel-heading"><div><h2>Brand &amp; target penjualan</h2><p>Realisasi omzet bulan ini. Brand tanpa target tidak dihitung pada omzet dashboard.</p></div></div>
    <div className="brand-target-grid">{brandMonthlySales.map(brand => <details className="brand-target-item brand-target-collapsible" key={brand.id} open={expandedBrandTarget === brand.id} onToggle={e => { if (e.currentTarget.open) setExpandedBrandTarget(brand.id); else if (expandedBrandTarget === brand.id) setExpandedBrandTarget(null) }}>
      <summary className="brand-target-summary"><div><b>{brand.nama}</b><span>{brand.target > 0 ? `${rupiah(brand.sold)} / ${rupiah(brand.target)}` : `${rupiah(brand.sold)} · tanpa target`}</span></div><div className="brand-target-summary-right"><span>{brand.target > 0 ? Math.round(brand.sold / brand.target * 100) + '%' : '-'}</span></div></summary>
      <div className="brand-target-track"><div style={{ width: brand.progress + '%' }} /></div>
      <div className="brand-target-bottom"><span>{brand.target > 0 ? 'Target bulanan' : 'Target belum diisi'}</span><div className="brand-target-edit"><input aria-label={'Target penjualan bulanan dalam Rupiah untuk ' + brand.nama} type="number" min="0" step="1000" value={targetDrafts[brand.id] ?? String(brand.target_bulanan || 0)} onChange={e => setTargetDrafts(current => ({ ...current, [brand.id]: e.target.value }))} /><button onClick={() => saveBrandTarget(brand)}>Simpan</button></div></div>
    </details>)}</div>
  </article>
</section>}
          {activeNav === 'Penjualan' && <section className="panel inventory-panel sales-page">
            <div className="inventory-heading sales-page-heading"><div><h2>Catat penjualan</h2><p>Isi barang, jumlah, harga, dan tanggal. Stok diperbarui otomatis saat disimpan.</p></div><span className="sales-count">{sales.length.toLocaleString('id-ID')} transaksi</span></div>
            <div className="sales-form-card">
              <div className="sales-form-grid">
                <label className="sales-field sales-field-product"><span>Barang yang dijual</span>
                  <select value={saleProductId} onChange={e => { const id = e.target.value; setSaleProductId(id); const item = products.find(p => p.id === Number(id)); if (item) setSalePrice(String(item.price)) }}>
                    <option value="">Pilih nama barang</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · {p.brand}</option>)}
                  </select>
                  <small>Pilih barang dari daftar stok.</small>
                </label>
                <label className="sales-field"><span>Jumlah terjual</span>
                  <div className="sales-input-wrap"><input type="number" min="1" step="1" inputMode="numeric" value={saleQty} onChange={e => setSaleQty(e.target.value)} /><small>unit</small></div>
                </label>
                <label className="sales-field"><span>Harga jual per unit</span>
                  <div className="sales-input-wrap sales-price-input"><small>Rp</small><input type="number" min="0" step="100" inputMode="numeric" value={salePrice} onChange={e => setSalePrice(e.target.value)} /></div>
                  <small>Harga dapat disesuaikan untuk transaksi ini.</small>
                </label>
                <label className="sales-field"><span>Tanggal penjualan</span>
                  <input type="date" value={saleDate} max={todayLocal()} onChange={e => setSaleDate(e.target.value)} />
                </label>
              </div>
              <div className="sales-form-bottom">
                <div className="sales-stock-info"><span>Stok tersedia</span><strong>{saleProductId && products.find(p => p.id === Number(saleProductId)) ? `${Number(products.find(p => p.id === Number(saleProductId))?.stock || 0).toLocaleString('id-ID')} unit` : 'Pilih barang dahulu'}</strong>{saleProductId && products.find(p => p.id === Number(saleProductId)) && <small>{products.find(p => p.id === Number(saleProductId))?.brand || 'Tanpa brand'}</small>}</div>
                <div className="sales-total"><span>Perkiraan total penjualan</span><strong>{rupiah(Math.max(0, Number(saleQty) || 0) * Math.max(0, Number(salePrice) || 0))}</strong></div>
                <button className="button-primary sales-submit" disabled={savingTransaction || loading || !products.length} onClick={addSale}><ShoppingCart size={16}/>{savingTransaction ? 'Menyimpan...' : 'Simpan penjualan'}</button>
              </div>
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
            <div className="inventory-heading"><div><h2>Riwayat penjualan</h2><p>Riwayat transaksi, harga sesuai nilai yang tersimpan saat penjualan.</p></div><button className="text-action" onClick={() => loadData()} disabled={loading}>Muat ulang <ArrowUpRight size={15} /></button></div>
            <div className="table-scroll"><table><thead><tr><th>TANGGAL</th><th>BARANG</th><th>BRAND</th><th>QTY</th><th>HARGA / UNIT</th><th>TOTAL</th><th>AKSI</th></tr></thead><tbody>{visibleSales.map(sale => <tr key={sale.id}><td>{new Date(sale.tanggal_pembelian + 'T00:00:00').toLocaleDateString('id-ID')}</td><td>{products.find(p => p.id === sale.barang_id)?.name || 'Barang tidak ditemukan'}</td><td>{sale.brand || 'Tanpa brand'}</td><td>{Number(sale.qty || 0).toLocaleString('id-ID')}</td><td>{rupiah(sale.harga)}</td><td className="price-cell">{rupiah(Number(sale.qty || 0) * sale.harga)}</td><td><div style={{ display: 'flex', gap: 6 }}><button className="text-action" title="Edit penjualan" disabled={savingTransaction} onClick={() => beginEditSale(sale)}><Pencil size={15} /></button><button className="text-action" title="Hapus penjualan" disabled={savingTransaction} onClick={() => deleteSale(sale)} style={{ color: '#c43d4b' }}><Trash2 size={15} /></button></div></td></tr>)}{sales.length === 0 && <tr><td colSpan={7} className="empty-state">Belum ada data penjualan.</td></tr>}</tbody></table></div>{pagination('penjualan', sortedSales.length, salesPage, salesPageCount, setSalesPage)}
          </section>}

          {activeNav === 'Barang Masuk' && <section className="panel inventory-panel" style={{ padding: 20 }}>
            <div className="inventory-heading"><div><h2>Catat barang masuk</h2><p>Pergerakan stok divalidasi database sebelum disimpan.</p></div><span className="demo-pill">{transactions.filter(t => t.type === 'masuk' || t.type === 'adjust_masuk').length.toLocaleString('id-ID')} DATA</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, margin: '18px 0 24px' }}>
              <div style={{ display: 'grid', gap: 7, position: 'relative' }}>
      <label style={{ fontSize: 13, fontWeight: 650 }}>Barang</label>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8990a3', pointerEvents: 'none' }} />
        <input value={incomingSearch} onChange={e => { setIncomingSearch(e.target.value); if (!e.target.value.trim()) setIncomingProductId('') }} placeholder="Cari nama barang atau brand..." style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 36px', border: '1px solid #dfe2eb', borderRadius: 9, background: '#fff' }} />
      </div>
      {incomingSearch.trim().length >= 2 && !incomingProductId && <div style={{ border: '1px solid #e2e5ed', borderRadius: 9, background: '#fff', overflow: 'hidden', boxShadow: '0 10px 25px rgba(20,30,60,.08)' }}>
        {incomingSearchResults.length > 0 ? incomingSearchResults.map(p => <button key={p.id} type="button" onClick={() => { setIncomingProductId(String(p.id)); setIncomingSearch(p.name) }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textAlign: 'left', padding: '11px 12px', border: 0, borderBottom: '1px solid #eef0f5', background: '#fff', cursor: 'pointer' }}><span style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 13 }}>{p.name}</b><span style={{ display: 'block', marginTop: 3, color: '#747b8d', fontSize: 12 }}>{p.brand}</span></span><span style={{ flexShrink: 0, fontSize: 12, color: p.stock < 0 ? '#c43d4b' : '#747b8d' }}>Stok {p.stock.toLocaleString('id-ID')}</span></button>) : <div style={{ padding: 12, color: '#747b8d', fontSize: 13 }}>Barang tidak ditemukan.</div>}
      </div>}
      {incomingProductId && (() => { const selected = products.find(p => p.id === Number(incomingProductId)); return selected ? <div style={{ padding: '10px 12px', border: '1px solid #dfe2eb', borderRadius: 9, background: '#f8f9fc' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><div style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 13 }}>{selected.name}</b><span style={{ color: '#747b8d', fontSize: 12 }}>{selected.brand} · stok {selected.stock.toLocaleString('id-ID')} unit</span></div><button type="button" onClick={() => { setIncomingProductId(''); setIncomingSearch('') }} style={{ border: 0, background: 'transparent', color: '#747b8d', cursor: 'pointer', padding: 4 }} title="Ganti barang"><X size={16} /></button></div></div> : null })()}
    </div>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Jumlah masuk (unit)
                <input type="number" min="1" step="1" value={incomingQty} onChange={e => setIncomingQty(e.target.value)} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Tanggal barang masuk
                <input type="date" value={incomingDate} max={todayLocal()} onChange={e => setIncomingDate(e.target.value)} />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'end', gap: 7 }}><span style={{ color: '#747b8d', fontSize: 12 }}>Stok barang pada tanggal tersebut</span><b style={{ fontSize: 18 }}>{incomingProductId && stockAtDate(Number(incomingProductId), incomingDate) !== null ? Number(stockAtDate(Number(incomingProductId), incomingDate)).toLocaleString('id-ID') + ' unit' : 'Pilih barang'}</b><button className="button-primary" disabled={savingTransaction || loading} onClick={addIncoming}>{savingTransaction ? 'Menyimpan...' : 'Simpan barang masuk'}</button></div>
            </div>
            <div className="inventory-heading"><div><h2>Riwayat barang masuk</h2><p>20 catatan terbaru dari buku transaksi stok.</p></div><button className="text-action" onClick={() => loadData()} disabled={loading}>Muat ulang <ArrowUpRight size={15} /></button></div>
            <div className="table-scroll"><table><thead><tr><th>TANGGAL</th><th>BARANG</th><th>JUMLAH MASUK</th><th>STOK SAAT INI</th></tr></thead><tbody>{visibleIncoming.map(tx => <tr key={tx.id}><td>{tx.tanggal ? new Date(tx.tanggal + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</td><td>{products.find(p => p.id === tx.barang_id)?.name || 'Barang tidak ditemukan'}</td><td>{Number(tx.qty || 0).toLocaleString('id-ID')} unit</td><td>{(products.find(p => p.id === tx.barang_id)?.stock ?? 0).toLocaleString('id-ID')} unit</td></tr>)}{transactions.filter(t => t.type === 'masuk' || t.type === 'adjust_masuk').length === 0 && <tr><td colSpan={4} className="empty-state">Belum ada data barang masuk.</td></tr>}</tbody></table></div>{pagination('barang masuk', incomingTransactions.length, incomingPage, incomingPageCount, setIncomingPage)}
          </section>}

          {activeNav === 'Laporan' && <section className="panel inventory-panel" style={{ padding: 20 }}>
            <div className="inventory-heading"><div><h2>Laporan penjualan</h2><p>Ringkasan omzet lintas brand berdasarkan harga yang tersimpan pada transaksi.</p></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, margin: '18px 0' }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Dari tanggal<input type="date" value={reportStartDate} max={reportEndDate || undefined} onChange={e => { setReportStartDate(e.target.value); setReportPage(1) }} /></label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Sampai tanggal<input type="date" value={reportEndDate} min={reportStartDate || undefined} max={todayLocal()} onChange={e => { setReportEndDate(e.target.value); setReportPage(1) }} /></label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 650 }}>Brand<select value={reportBrand} onChange={e => { setReportBrand(e.target.value); setReportPage(1) }} style={{ minWidth: 0, padding: 11, border: '1px solid #dfe2eb', borderRadius: 9, background: '#fff' }}><option value="all">Semua brand</option>{[...new Set([...brands.map(b => b.nama), ...sales.map(s => s.brand || 'Tanpa brand')])].sort((a,b) => a.localeCompare(b)).map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></label>
            </div>
            <div className="metric-grid" style={{ marginBottom: 22 }}>
              <article className="metric-card"><div className="metric-top"><span>Total omzet</span><div className="metric-icon purple"><TrendingUp size={19} /></div></div><div className="metric-value">{rupiah(reportRevenue)}</div><div className="metric-foot"><span className="foot-neutral">Sesuai periode dan filter brand</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Unit terjual</span><div className="metric-icon blue"><ShoppingCart size={19} /></div></div><div className="metric-value">{reportQty.toLocaleString('id-ID')}<small> unit</small></div><div className="metric-foot"><span className="foot-neutral">Dari transaksi terpilih</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Jumlah transaksi</span><div className="metric-icon purple"><Activity size={19} /></div></div><div className="metric-value">{reportSales.length.toLocaleString('id-ID')}</div><div className="metric-foot"><span className="foot-neutral">Catatan penjualan</span></div></article>
            </div>
            <div className="inventory-heading"><div><h2>Ringkasan per brand</h2><p>{reportByBrand.length.toLocaleString('id-ID')} brand dengan transaksi pada periode terpilih.</p></div></div>
            <div className="table-scroll"><table><thead><tr><th>BRAND</th><th>TRANSAKSI</th><th>UNIT TERJUAL</th><th>OMZET</th></tr></thead><tbody>{reportByBrand.map(row => <tr key={row.brand}><td><b>{row.brand}</b></td><td>{row.transactions.toLocaleString('id-ID')}</td><td>{row.qty.toLocaleString('id-ID')}</td><td className="price-cell">{rupiah(row.revenue)}</td></tr>)}{reportByBrand.length === 0 && <tr><td colSpan={4} className="empty-state">Tidak ada penjualan pada periode ini.</td></tr>}</tbody></table></div>
            <div className="inventory-heading" style={{ marginTop: 24 }}><div><h2>Detail penjualan</h2><p>Menampilkan 7 catatan per halaman.</p></div></div>
            <div className="table-scroll"><table><thead><tr><th>TANGGAL</th><th>BARANG</th><th>BRAND</th><th>QTY</th><th>HARGA / UNIT</th><th>TOTAL</th></tr></thead><tbody>{visibleReportSales.map(sale => <tr key={sale.id}><td>{new Date(sale.tanggal_pembelian + 'T00:00:00').toLocaleDateString('id-ID')}</td><td>{products.find(p => p.id === sale.barang_id)?.name || 'Barang tidak ditemukan'}</td><td>{sale.brand || 'Tanpa brand'}</td><td>{Number(sale.qty || 0).toLocaleString('id-ID')}</td><td>{rupiah(sale.harga)}</td><td className="price-cell">{rupiah(Number(sale.qty || 0) * sale.harga)}</td></tr>)}{reportSales.length === 0 && <tr><td colSpan={6} className="empty-state">Tidak ada data penjualan pada filter ini.</td></tr>}</tbody></table></div>{pagination('penjualan laporan', reportSales.length, reportPage, reportPageCount, setReportPage)}
          </section>}

          {activeNav === 'Penyesuaian Stok' && <section className="panel inventory-panel" style={{ padding: 20 }}>
            <div className="inventory-heading"><div><h2>Penyesuaian stok</h2><p>Samakan catatan sistem dengan hasil stok fisik. Selisih disimpan sebagai transaksi penyesuaian.</p></div><span className="sales-count">{transactions.filter(t => t.type === 'adjust' || t.type === 'adjust_masuk' || t.type === 'adjust_keluar').length.toLocaleString('id-ID')} CATATAN</span></div>
            <div className="sales-form-card" style={{ marginTop: 4 }}>
              <div className="sales-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
                <label className="sales-field sales-field-product"><span>Barang</span><select value={adjustProductId} onChange={e => { setAdjustProductId(e.target.value); const p = products.find(item => item.id === Number(e.target.value)); if (p) setAdjustStock(String(p.stock)) }}><option value="">Pilih barang</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · stok {p.stock}</option>)}</select><small>Stok minus tetap diperbolehkan jika barang masih PO.</small></label>
                <label className="sales-field"><span>Stok fisik sebenarnya</span><input type="number" step="any" value={adjustStock} onChange={e => setAdjustStock(e.target.value)} /><small>Masukkan jumlah fisik yang benar, bukan selisih.</small></label>
                <label className="sales-field"><span>Tanggal penyesuaian</span><input type="date" value={adjustDate} max={todayLocal()} onChange={e => setAdjustDate(e.target.value)} /></label>
              </div>
              <div className="sales-form-bottom">
                <div className="sales-stock-info"><span>Stok sistem pada tanggal</span><strong>{adjustProductId && stockAtDate(Number(adjustProductId), adjustDate) !== null ? Number(stockAtDate(Number(adjustProductId), adjustDate)).toLocaleString('id-ID') + ' unit' : 'Pilih barang'}</strong></div>
                <div className="sales-stock-info"><span>Perubahan yang dicatat</span><strong>{adjustProductId && Number.isFinite(Number(adjustStock)) ? (Number(adjustStock) - Number(stockAtDate(Number(adjustProductId), adjustDate) ?? 0)).toLocaleString('id-ID') + ' unit' : '-'}</strong></div>
                <button className="button-primary sales-submit" disabled={savingTransaction || loading || !adjustProductId} onClick={saveStockAdjustment}>{savingTransaction ? 'Menyimpan...' : 'Simpan penyesuaian'}</button>
              </div>
            </div>
            <div className="inventory-heading"><div><h2>Riwayat penyesuaian</h2><p>Riwayat penyesuaian manual yang tersimpan di buku transaksi.</p></div><button className="text-action" onClick={() => loadData()} disabled={loading}>Muat ulang <ArrowUpRight size={15} /></button></div>
            <div className="table-scroll"><table><thead><tr><th>TANGGAL</th><th>BARANG</th><th>JENIS</th><th>SELISIH STOK</th></tr></thead><tbody>{transactions.filter(t => t.type === 'adjust' || t.type === 'adjust_masuk' || t.type === 'adjust_keluar').sort((a,b) => (b.tanggal || '').localeCompare(a.tanggal || '') || b.id-a.id).slice(0,50).map(tx => <tr key={tx.id}><td>{tx.tanggal ? new Date(tx.tanggal + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</td><td>{products.find(p => p.id === tx.barang_id)?.name || 'Barang tidak ditemukan'}</td><td>{tx.type === 'adjust' ? 'Penyesuaian' : tx.type === 'adjust_masuk' ? 'Koreksi masuk' : 'Koreksi keluar'}</td><td className={Number(tx.qty) < 0 || tx.type === 'adjust_keluar' ? 'stock-zero' : ''}>{(tx.type === 'adjust_keluar' ? -Math.abs(Number(tx.qty)) : Number(tx.qty)).toLocaleString('id-ID')} unit</td></tr>)}{transactions.filter(t => t.type === 'adjust' || t.type === 'adjust_masuk' || t.type === 'adjust_keluar').length === 0 && <tr><td colSpan={4} className="empty-state">Belum ada penyesuaian stok.</td></tr>}</tbody></table></div>
          </section>}
          {activeNav === 'Barang & Stok' && <section className="panel inventory-panel"><div className="inventory-heading"><div><h2>Daftar barang</h2><p>{loading ? 'Memuat data dari Supabase...' : 'Data barang dari database StokFlow'}</p></div><button className="text-action" onClick={() => loadData()}>Muat ulang <ArrowUpRight size={15} /></button></div><div className="table-tools"><div className="search-field"><Search size={17} /><input placeholder="Cari nama barang, SKU, atau brand..." value={query} onChange={e => { setQuery(e.target.value); setInventoryPage(1) }} />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}</div><button className="filter-button" onClick={() => setNotice('Filter lanjutan kita aktifkan pada tahap berikutnya.')}><SlidersHorizontal size={16} /> Filter</button></div><div className="table-scroll"><table><thead><tr><th>BARANG</th><th>BRAND</th><th>KATEGORI</th><th>STOK</th><th>HARGA / UNIT</th><th>STATUS</th><th></th></tr></thead><tbody>{visibleProducts.map(p => <tr key={p.id}><td><div className="product-cell"><div className="product-icon"><Package size={18} /></div><div><b>{p.name}</b><span>{p.sku}</span></div></div></td><td><span className="brand-name">{p.brand}</span></td><td className="muted-cell">{p.category}</td><td><b className={p.stock <= 0 ? 'stock-zero' : ''}>{p.stock}</b><span className="unit-label"> unit</span></td><td className="price-cell">{p.price ? rupiah(p.price) : 'Belum diatur'}</td><td><span className={'status-badge ' + (p.status === 'Aman' ? 'status-safe' : p.status === 'Menipis' ? 'status-low' : 'status-out')}><i />{p.status}</span></td><td><button className="row-more"><MoreHorizontal size={18} /></button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7} className="empty-state">Tidak ada barang yang cocok.</td></tr>}</tbody></table></div>{pagination('barang', filtered.length, inventoryPage, inventoryPageCount, setInventoryPage)}<div className="table-footer"><span>Hasil pencarian: <b>{filtered.length}</b> dari <b>{products.length}</b> barang</span><span>● Data live dari Supabase</span></div></section>}
          <footer className="page-footer"><span>©2026 Toni No BPJS KETENAGAKERJAAN</span></footer>
        </div>
        <nav className="mobile-bottom-nav" aria-label="Navigasi utama">{navItems.map(item => { const Icon = item.icon; const label = item.label === 'Barang & Stok' ? 'Stok' : item.label === 'Penyesuaian Stok' ? 'Koreksi' : item.label === 'Barang Masuk' ? 'Masuk' : item.label === 'Penjualan' ? 'Jual' : item.label; return <button key={item.label} className={'mobile-nav-item ' + (activeNav === item.label ? 'mobile-nav-active' : '')} onClick={() => setActiveNav(item.label)}><Icon size={19} /><span>{label}</span></button> })}</nav>
      </main>
    </div>
  )
}
