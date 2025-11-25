import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Plus, Edit2, Trash2, TrendingUp, LayoutGrid, List, Wallet } from 'lucide-react'

const COLORS = {
  primary: "#2563EB",
  success: "#10B981",
  successLight: "#D1FAE5",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  textDark: "#111827",
  textGray: "#6B7280",
  bg: "#F3F4F6",
  white: "#FFFFFF",
  border: "#E5E7EB"
};

// --- ICONS ---
const expenseIcons = [
  '🛍️', '🍔', '🚗', '🩺', '📚', '🎬', '✈️', '🏠', '⚡', '💻', '👕', '☕', '🎟️'
]
const incomeIcons = [
  '💵', '💼', '📈', '🎁'
]
const ICON_LABELS = {
  '🛍️': 'Shopping', '🍔': 'Food', '🚗': 'Transport', '🩺': 'Health',
  '📚': 'Education', '🎬': 'Entertainment', '✈️': 'Travel', '🏠': 'Housing',
  '⚡': 'Utilities', '💻': 'Electronics', '👕': 'Clothing', 
  '☕': 'Coffee', '🎟️': 'Events',
  '💵': 'Salary', '💼': 'Business', '📈': 'Invest', '🎁': 'Bonus'
}

const ICON_TO_TEXT = {
  'Shopping Cart': 'Shopping',
  'Hamburger': 'Food',
  'Car': 'Transport',
  'Stethoscope': 'Health',
  'Book': 'Education',
  'Clapper Board': 'Entertainment',
  'Airplane': 'Travel',
  'House': 'Housing',
  'Lightning Bolt': 'Utilities',
  'Laptop': 'Electronics',
  'Shirt': 'Clothing',
  'Hot Beverage': 'Coffee',
  'Ticket': 'Events',
  'Money Bag': 'Salary',
  'Briefcase': 'Business',
  'Chart Increasing': 'Invest',
  'Gift': 'Bonus'
}

const TEXT_TO_ICON = {
  'Shopping': '🛍️',
  'Food': '🍔',
  'Transport': '🚗',
  'Health': '🩺',
  'Education': '📚',
  'Entertainment': '🎬',
  'Travel': '✈️',
  'Housing': '🏠',
  'Utilities': '⚡',
  'Electronics':  '💻',
  'Clothing': '👕',
  'Coffee': '☕',
  'Events': '🎟️',
  'Salary': '💵',
  'Business': '💼',
  'Invest': '📈',
  'Bonus': '🎁'
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [wallets, setWallets] = useState([])
  const [currentWallet, setCurrentWallet] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7))
  const [viewType, setViewType] = useState('list')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(false)

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [entryType, setEntryType] = useState('expense')
  const [newEntry, setNewEntry] = useState({
    item: '',
    price: '',
    store: '',
    date: new Date().toISOString().split('T')[0],
    icon: '🛍️'
  })

  // 1. Load Wallets
  const loadWallets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: owned } = await supabase.from('wallets').select('id, name').eq('owner_id', user.id)
    const { data: shared } = await supabase.from('wallet_members').select('wallets!inner(id, name)').eq('user_id', user.id)
    const allWallets = [...(owned || []), ...(shared?.map(m => m.wallets) || [])]
    
    // Deduplicate
    const uniqueWallets = Array.from(new Map(allWallets.map(w => [w.id, w])).values())
    setWallets(uniqueWallets)
    
    const saved = localStorage.getItem('currentWalletId')
    setCurrentWallet(uniqueWallets.find(w => w.id === saved) || uniqueWallets[0])
  }

  // 2. Fetch Transactions
  const fetchData = async () => {
    if (!currentWallet) return
    setLoading(true)
    
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', currentWallet.id)
        .order('date', { ascending: false })

      if (search) query = query.ilike('item', `%${search}%`)
      if (selectedDate) {
        const [y, m] = selectedDate.split('-')
        // Simple month filtering logic
        const start = `${y}-${m}-01`
        // Calculate end date properly (next month's 1st day)
        const end = new Date(parseInt(y), parseInt(m), 1).toISOString().split('T')[0]
        query = query.gte('date', start).lt('date', end)
      }
      if (selectedCategory) query = query.eq('category', selectedCategory)

      const { data, error } = await query
      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.error("Error fetching transactions:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWallets();
  }, []);
  useEffect(() => {
    const handleWalletChange = () => {
      // Force reload current wallet from localStorage
      const savedId = localStorage.getItem('currentWalletId');
      if (savedId && wallets.length > 0) {
        const found = wallets.find(w => w.id === savedId) || wallets[0];
        setCurrentWallet(found);
      }
      // This will trigger fetchData() because currentWallet changed
    };

    window.addEventListener('walletChanged', handleWalletChange);
    window.addEventListener('storage', handleWalletChange);

    return () => {
      window.removeEventListener('walletChanged', handleWalletChange);
      window.removeEventListener('storage', handleWalletChange);
    };
  }, [wallets]);
  useEffect(() => { fetchData() }, [currentWallet, search, selectedDate, selectedCategory])

  // 3. Save Entry (Add/Edit)
  const handleSaveEntry = async () => {
    if (!newEntry.item.trim() || !newEntry.price) return alert('Please fill Item and Amount')
    
    // Get current user for user_id field
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert("You must be logged in")

    const payload = {
      wallet_id: currentWallet.id,
      user_id: user.id, // IMPORTANT: Linking transaction to user
      item: newEntry.item,
      price: parseFloat(newEntry.price),
      store: newEntry.store || (entryType === 'income' ? 'Income Source' : 'Store'),
      date: newEntry.date,
      category: ICON_TO_TEXT[newEntry.icon] || 'Shopping',
      category_type: entryType
    }

    try {
      if (editingItem) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('transactions').insert(payload)
        if (error) throw error
      }
      
      setShowAddModal(false)
      setEditingItem(null)
      // Reset form
      setNewEntry({
        item: '', price: '', store: '',
        date: new Date().toISOString().split('T')[0],
        icon: entryType === 'income' ? '💵' : '🛍️'
      })
      fetchData() // Refresh list
    } catch (err) {
      alert("Error saving transaction: " + err.message)
    }
  }

  // 4. Delete Entry
  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return
    await supabase.from('transactions').delete().eq('id', id)
    fetchData()
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setEntryType(item.category_type || 'expense')
    setNewEntry({
      item: item.item,
      price: item.price,
      store: item.store,
      date: item.date,
      icon: item.icon
    })
    setShowAddModal(true)
  }

  // --- CALCULATIONS ---
  const totalIncome = transactions.filter(t => t.category_type === 'income').reduce((s, t) => s + t.price, 0)
  const totalExpense = transactions.filter(t => t.category_type !== 'income').reduce((s, t) => s + t.price, 0)
  const balance = totalIncome - totalExpense

  // Chart Logic: Income vs Expense %
  const totalVolume = totalIncome + totalExpense
  const incomePct = totalVolume === 0 ? 0 : (totalIncome / totalVolume) * 100
  const expensePct = totalVolume === 0 ? 0 : (totalExpense / totalVolume) * 100

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const getMonthName = (d) => new Date(d + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })

  // --- RENDER ---
  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* 1. HEADER & SUMMARY CARD (Mobile First) */}
      <div style={{ background: COLORS.white, padding: '20px 0 10px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '18px', color: COLORS.textDark }}>
              {getMonthName(selectedDate)}
              {/* Native Month Picker hidden but clickable */}
              <input 
                type="month" 
                style={{ position: 'absolute', opacity: 0, cursor: 'pointer', width: '120px' }} 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)} 
              />
            </div>
            
            {/* Wallet Selector Mockup (or active wallet name) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: COLORS.bg, borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
              <Wallet size={14} />
              {currentWallet ? currentWallet.name : 'Loading...'}
            </div>
          </div>

          {/* GRADIENT SUMMARY CARD WITH CHART */}
          <div style={summaryCardStyle}>
            {/* Left Side: Balance & Text */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9, marginBottom: '4px' }}>Total Balance</p>
              <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px' }}>
                RM {balance.toFixed(2)}
              </h2>
              
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.9 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}></div> Income
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>RM {totalIncome.toFixed(2)}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.9 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }}></div> Expense
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>RM {totalExpense.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Right Side: Circle Chart (Pure SVG) */}
            <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background Circle */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                {/* Income Segment (White) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  strokeDasharray={`${incomePct}, 100`}
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              </svg>
              {/* Inner Percentage Label */}
              <div style={{ 
                position: 'absolute', inset: 0, display: 'flex', 
                alignItems: 'center', justifyContent: 'center', 
                fontSize: '10px', fontWeight: 'bold' 
              }}>
                {Math.round(incomePct)}%
              </div>
            </div>
          </div>

        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px 80px' }}>
        {currentWallet ? (
          <>
            {/* 2. FILTERS & VIEW TOGGLE */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
              
              {/* Search Bar */}
              <div style={{ position: 'relative', flex: 1, minWidth: '140px' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: COLORS.textGray }} />
                <input 
                  style={searchStyle} 
                  placeholder="Search..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              {/* Category Chips (Optional but nice for mobile) */}
              <div style={{ position: 'relative', flex: 1, maxWidth: '210px' }}>
                <select 
                  style={{ ...searchStyle, width: '100%'}} 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {[...expenseIcons, ...incomeIcons].map(icon => (
                    <option key={icon} value={icon}>{icon} {ICON_LABELS[icon]}</option>
                  ))}
                </select>
              </div>
              {/* View Toggle */}
              <div style={{ display: 'flex', background: COLORS.white, borderRadius: '10px', padding: '4px', border: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
                <ViewBtn icon={<List size={18}/>} active={viewType==='list'} onClick={()=>setViewType('list')} />
                <ViewBtn icon={<LayoutGrid size={18}/>} active={viewType==='grid'} onClick={()=>setViewType('grid')} />
              </div>
            </div>
            {/* 3. TRANSACTIONS LIST */}
            {loading ? (
              <p style={{ textAlign: 'center', color: COLORS.textGray }}>Loading...</p>
            ) : transactions.length > 0 ? (
              viewType === 'list' ? (
                <div style={{ background: COLORS.white, borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  {transactions.map((t, i) => (
                    <div 
                      key={t.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderBottom: i === transactions.length - 1 ? 'none' : `1px solid ${COLORS.bg}`
                      }}
                    >
                      {/* Icon & Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '42px', height: '42px', borderRadius: '12px', 
                          background: t.category_type === 'income' ? COLORS.successLight : COLORS.dangerLight,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '20px'
                        }}>
                          {TEXT_TO_ICON[t.category] || t.category}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: COLORS.textDark, marginBottom: '2px' }}>{t.item}</div>
                          <div style={{ fontSize: '12px', color: COLORS.textGray }}>{formatDate(t.date)} • {t.store}</div>
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontWeight: '700', fontSize: '15px', 
                          color: t.category_type === 'income' ? COLORS.success : COLORS.danger,
                          marginBottom: '4px'
                        }}>
                          {t.category_type === 'income' ? '+' : '-'} {t.price.toFixed(2)}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Edit2 size={14} color={COLORS.textGray} style={{ cursor: 'pointer' }} onClick={() => handleEdit(t)} />
                          <Trash2 size={14} color={COLORS.danger} style={{ cursor: 'pointer' }} onClick={() => handleDelete(t.id)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={gridContainerStyle}>
                  {transactions.map(t => (
                    <div key={t.id} style={gridCardStyle}>
                       <div style={{ fontSize: '32px', marginBottom: '12px' }}>{TEXT_TO_ICON[t.category] || t.category}</div>
                       <div style={{ fontWeight: '700', color: COLORS.textDark }}>{t.item}</div>
                       <div style={{ fontSize: '12px', color: COLORS.textGray, marginBottom: '12px' }}>{formatDate(t.date)}</div>
                       <div style={{ 
                          fontWeight: '700', fontSize: '16px', 
                          color: t.category_type === 'income' ? COLORS.success : COLORS.danger 
                       }}>
                         {t.category_type === 'income' ? '+' : '-'} {t.price.toFixed(2)}
                       </div>
                       
                       <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                          <button onClick={()=>handleEdit(t)} style={iconBtnStyle}><Edit2 size={14}/></button>
                          <button onClick={()=>handleDelete(t.id)} style={{...iconBtnStyle, color:COLORS.danger, background: COLORS.dangerLight}}><Trash2 size={14}/></button>
                       </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div style={emptyStateStyle}>
                <TrendingUp size={48} color={COLORS.textGray} style={{ opacity: 0.3, marginBottom: 16 }} />
                <p style={{ color: COLORS.textGray }}>No transactions found.</p>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '40px', color: COLORS.textGray }}>
            Loading wallets...
          </div>
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      {currentWallet && (
        <button
          style={fabStyle}
          onClick={() => {
            setEditingItem(null)
            setEntryType('expense')
            setNewEntry({
              item: '', price: '', store: '',
              date: new Date().toISOString().split('T')[0],
              icon: '🛍️'
            })
            setShowAddModal(true)
          }}
        >
          <Plus size={28} />
        </button>
      )}

      {/* ADD/EDIT MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalBoxStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: COLORS.textDark }}>
              {editingItem ? 'Edit' : 'Add'} Transaction
            </h2>

            {/* Type Switcher */}
            <div style={{ display: 'flex', background: COLORS.bg, padding: 4, borderRadius: 12, marginBottom: 24 }}>
              <TabBtn 
                label="Expense" 
                active={entryType==='expense'} 
                color={COLORS.danger} 
                onClick={() => { setEntryType('expense'); setNewEntry({...newEntry, icon: '🛍️'}) }} 
              />
              <TabBtn 
                label="Income" 
                active={entryType==='income'} 
                color={COLORS.success} 
                onClick={() => { setEntryType('income'); setNewEntry({...newEntry, icon: '💵'}) }} 
              />
            </div>

            {/* Icon Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
              {(entryType === 'expense' ? expenseIcons : incomeIcons).map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewEntry({...newEntry, icon})}
                  style={{
                    fontSize: '22px', borderRadius: '10px', height: '44px',
                    background: newEntry.icon === icon ? (entryType === 'income' ? COLORS.successLight : COLORS.dangerLight) : COLORS.white,
                    border: newEntry.icon === icon ? `2px solid ${entryType === 'income' ? COLORS.success : COLORS.danger}` : `1px solid ${COLORS.border}`,
                    cursor: 'pointer'
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <input 
              placeholder="Item Name (e.g. Groceries)" 
              value={newEntry.item} 
              onChange={e=>setNewEntry({...newEntry, item:e.target.value})} 
              style={modalInputStyle} 
            />
            <input 
              type="number" 
              placeholder="Amount (RM)" 
              value={newEntry.price} 
              onChange={e=>setNewEntry({...newEntry, price:e.target.value})} 
              style={modalInputStyle} 
            />
            <input 
              placeholder={entryType==='income'?"Source":"Store / Location"} 
              value={newEntry.store} 
              onChange={e=>setNewEntry({...newEntry, store:e.target.value})} 
              style={modalInputStyle} 
            />
            <input 
              type="date" 
              value={newEntry.date} 
              onChange={e=>setNewEntry({...newEntry, date:e.target.value})} 
              style={{...modalInputStyle, marginBottom: 24}} 
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleSaveEntry} style={{...primaryBtnStyle, background: entryType==='income'?COLORS.success:COLORS.danger}}>
                Save
              </button>
              <button onClick={()=>setShowAddModal(false)} style={cancelBtnStyle}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- SUB COMPONENTS & STYLES ---

const ViewBtn = ({ icon, active, onClick }) => (
  <button onClick={onClick} style={{ padding: '6px 10px', borderRadius: 8, background: active ? COLORS.bg : 'transparent', border: 'none', cursor: 'pointer', color: active ? COLORS.textDark : COLORS.textGray }}>
    {icon}
  </button>
)

const TabBtn = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{ flex: 1, padding: '10px', borderRadius: 10, background: active ? COLORS.white : 'transparent', color: active ? color : COLORS.textGray, fontWeight: 600, boxShadow: active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', border: 'none', transition: 'all 0.2s' }}>
    {label}
  </button>
)

// STYLES
const summaryCardStyle = {
  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.success} 100%)`,
  borderRadius: '24px',
  padding: '28px',
  color: COLORS.white,
  boxShadow: '0 12px 24px rgba(37, 99, 235, 0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const fabStyle = {
  position: 'fixed', bottom: '24px', right: '24px',
  width: '60px', height: '60px', borderRadius: '50%',
  backgroundColor: COLORS.primary, color: COLORS.white,
  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', cursor: 'pointer', zIndex: 100,
  transition: 'transform 0.1s'
}

const searchStyle = {
  width: '100%', padding: '10px 10px 10px 40px', 
  borderRadius: '12px', border: `1px solid ${COLORS.border}`, 
  fontSize: '14px', outline: 'none', background: COLORS.white 
}

const modalInputStyle = { 
  width: '100%', padding: '14px', marginBottom: '12px', 
  borderRadius: '12px', border: `1px solid ${COLORS.border}`, 
  fontSize: '15px', outline: 'none' 
}

const gridContainerStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }
const gridCardStyle = { background: COLORS.white, padding: '20px', borderRadius: '16px', position: 'relative', border: `1px solid ${COLORS.border}` }
const iconBtnStyle = { border: 'none', padding: 6, borderRadius: 6, background: COLORS.bg, cursor: 'pointer' }
const emptyStateStyle = { textAlign: 'center', padding: '60px 20px', background: COLORS.white, borderRadius: '16px' }

const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }
const modalBoxStyle = { background: COLORS.white, padding: '28px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
const primaryBtnStyle = { flex: 1, padding: '14px', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '15px' }
const cancelBtnStyle = { flex: 1, padding: '14px', background: COLORS.bg, color: COLORS.textDark, border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '15px' }