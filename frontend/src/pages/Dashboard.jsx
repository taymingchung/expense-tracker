import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Plus, Edit2, Trash2, TrendingUp, LayoutGrid, List } from 'lucide-react'

const COLORS = {
  primary: "#2563EB",
  success: "#10B981",
  successLight: "#ECFDF5",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  textDark: "#111827",
  textGray: "#6B7280",
  bg: "#F3F4F6",
  white: "#FFFFFF",
  border: "#E5E7EB"
};

// Real emojis — this is what makes it beautiful!
const expenseIcons = [
  '🛍️', '🍔', '🚗', '🩺', '📚', '🎬', '✈️', '🏠', '⚡', '💻', '👕', '☕', '🎟️'
]

const incomeIcons = [
  '💵', '💼', '📈', '🎁'
]

// For category filter dropdown
const ICON_LABELS = {
  '🛍️': 'Shopping', '🍔': 'Food', '🚗': 'Transport', '🩺': 'Health',
  '📚': 'Education', '🎬': 'Entertainment', '✈️': 'Travel', '🏠': 'Housing',
  '⚡': 'Utilities', '💻': 'Electronics', '👕': 'Clothing', 
  '☕': 'Coffee', '🎟️': 'Events',
  '💵': 'Salary', '💼': 'Business', '📈': 'Investment', '🎁': 'Bonus'
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [wallets, setWallets] = useState([])
  const [currentWallet, setCurrentWallet] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7))
  const [viewType, setViewType] = useState('list')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Modal & Form
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [entryType, setEntryType] = useState('expense')
  const [newEntry, setNewEntry] = useState({
    item: '',
    price: '',
    store: '',
    date: new Date().toISOString().split('T')[0],
    icon: 'shopping'
  })

  // Load wallets
  const loadWallets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: owned } = await supabase.from('wallets').select('id, name').eq('owner_id', user.id)
    const { data: shared } = await supabase.from('wallet_members').select('wallets!inner(id, name)').eq('user_id', user.id)
    const allWallets = [...(owned || []), ...(shared?.map(m => m.wallets) || [])]
    const uniqueWallets = Array.from(new Map(allWallets.map(w => [w.id, w])).values())
    setWallets(uniqueWallets)
    const saved = localStorage.getItem('currentWalletId')
    setCurrentWallet(uniqueWallets.find(w => w.id === saved) || uniqueWallets[0])
  }

  // Fetch transactions
  const fetchData = async () => {
    if (!currentWallet) return
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', currentWallet.id)
      .order('date', { ascending: false })

    if (search) query = query.ilike('item', `%${search}%`)
    if (selectedDate) {
      const [y, m] = selectedDate.split('-')
      query = query.gte('date', `${y}-${m}-01`)
                   .lt('date', `${y}-${(parseInt(m) + 1).toString().padStart(2, '0')}-01`)
    }
    if (selectedCategory) query = query.eq('icon', selectedCategory)

    const { data, error } = await query
    if (error) console.error(error)
    else setTransactions(data || [])
  }

  useEffect(() => { loadWallets() }, [])
  useEffect(() => { fetchData() }, [currentWallet, search, selectedDate, selectedCategory])

  // Handlers
  const handleSaveEntry = async () => {
    if (!newEntry.item.trim() || !newEntry.price) return alert('Please fill Item and Amount')

    const payload = {
      wallet_id: currentWallet.id,
      item: newEntry.item,
      price: parseFloat(newEntry.price),
      store: newEntry.store || (entryType === 'income' ? 'Income Source' : 'Store'),
      date: newEntry.date,
      icon: newEntry.icon,
      category_type: entryType
    }

    if (editingItem) {
      await supabase.from('transactions').update(payload).eq('id', editingItem.id)
    } else {
      await supabase.from('transactions').insert(payload)
    }

    setShowAddModal(false)
    setEditingItem(null)
    setNewEntry({
      item: '', price: '', store: '',
      date: new Date().toISOString().split('T')[0],
      icon: entryType === 'income' ? '💵' : '🛍️' // Use specific icons
    })
    fetchData()
  }

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

  // Calculations
  const totalIncome = transactions.filter(t => t.category_type === 'income').reduce((s, t) => s + t.price, 0)
  const totalExpense = transactions.filter(t => t.category_type !== 'income').reduce((s, t) => s + t.price, 0)
  const balance = totalIncome - totalExpense

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const getMonthName = (d) => new Date(d + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })

  // --- START OF NEW UI STRUCTURE ---
  return (
    // Use padding: 0 20px for mobile width, and max-width 1200px for desktop
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: '-apple-system, sans-serif' }}>
      
      {/* HEADER & SUMMARY (MOBILE-FIRST) */}
      <div style={{ background: COLORS.white, padding: '20px 0 0', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* TOP BAR: Month/Filter & Wallet/Profile Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button 
              onClick={() => {/* Open Month Picker Modal */}}
              style={headerTitleStyle}
            >
              {getMonthName(selectedDate)}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            
            <button 
               onClick={() => {/* Open Wallet/Profile Modal */}}
               style={profileBtnStyle}>
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          </div>

          {/* SUMMARY CARD (Gradient Style) */}
          <div style={summaryCardStyle}>
            <p style={summaryTextStyle}>Current Balance in {currentWallet ? currentWallet.name : 'Wallet'}</p>
            <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 16px' }}>
              RM {balance.toFixed(2)}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <p style={summaryTextStyle}>Total Income</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: COLORS.successLight }}>
                  +RM {totalIncome.toFixed(2)}
                </p>
              </div>
              <div>
                <p style={summaryTextStyle}>Total Expense</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: COLORS.dangerLight }}>
                  -RM {totalExpense.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        {currentWallet ? (
          <>
            {/* CONTROLS (View Toggle is kept here) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', background: COLORS.white, borderRadius: '8px', padding: '4px', border: `1px solid ${COLORS.border}` }}>
                <ViewBtn icon={<List size={16}/>} active={viewType==='list'} onClick={()=>setViewType('list')} />
                <ViewBtn icon={<LayoutGrid size={16}/>} active={viewType==='grid'} onClick={()=>setViewType('grid')} />
              </div>
              {/* ActionBtn removed, replaced by FAB */}
            </div>

            {/* FILTERS (Responsive Layout) */}
            <div style={filterGridStyle}>
              {/* Search */}
              <div style={{position:'relative'}}>
                <Search size={18} style={{position:'absolute', left:14, top:12, color:COLORS.textGray}}/>
                <input style={inputStyle} placeholder="Search item or store..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              
              {/* Category Filter */}
              <select style={inputStyle} value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}>
                <option value="">All Categories</option>
                {[...expenseIcons, ...incomeIcons].map(icon => (
                  <option key={icon} value={icon}>{icon} {ICON_LABELS[icon]}</option>
                ))}
              </select>
              
              {/* Month Filter */}
              <input type="month" style={inputStyle} value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
            </div>

            {/* TRANSACTIONS */}
            {transactions.length > 0 ? (
              viewType === 'list' ? (
                // List View (Table on Desktop, Collapsible List on Mobile)
                <div style={{ background: COLORS.white, borderRadius: '12px', overflow: 'hidden' }}>
                  {/* For mobile, hide the table headers and use flex/grid */}
                  <table style={mobileTableStyle}>
                    <thead style={tableHeaderStyle}>
                      <tr>
                        {['Date', 'Item', 'Store/Source', 'Amount', ''].map(h => 
                          <th key={h} style={tableHeadCellStyle(h)}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id} style={tableRowStyle}>
                          <td style={tableCellDateStyle}>{formatDate(t.date)}</td>
                          <td style={tableCellItemStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '24px' }}>{t.icon}</span>
                              <div>
                                <div style={{ fontWeight: '600' }}>{t.item}</div>
                                <TypeBadge type={t.category_type} />
                              </div>
                            </div>
                          </td>
                          <td style={tableCellDetailStyle}>{t.store || '-'}</td>
                          <td style={tableCellAmountStyle(t.category_type)}>
                            {t.category_type === 'income' ? '+' : '-'} RM {t.price.toFixed(2)}
                          </td>
                          <td style={tableCellActionsStyle}>
                            <button onClick={()=>handleEdit(t)} style={actionBtnStyle}><Edit2 size={14}/></button>
                            <button onClick={()=>handleDelete(t.id)} style={{...actionBtnStyle, background: COLORS.dangerLight, color: COLORS.danger}}><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Grid View
                <div style={gridContainerStyle}>
                  {transactions.map(t => (
                    <div key={t.id} style={gridCardStyle}>
                      <div style={gridActionsStyle}>
                        <button onClick={()=>handleEdit(t)} style={iconBtnStyle}><Edit2 size={14}/></button>
                        <button onClick={()=>handleDelete(t.id)} style={{...iconBtnStyle, color:COLORS.danger, background: COLORS.dangerLight}}><Trash2 size={14}/></button>
                      </div>
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>{t.icon}</div>
                      <h3 style={{ fontWeight: '700', marginBottom: '4px' }}>{t.item}</h3>
                      <p style={{ fontSize: '13px', color: COLORS.textGray, marginBottom: '16px' }}>{t.store || '—'}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: COLORS.textGray }}>{formatDate(t.date)}</span>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: t.category_type==='income' ? COLORS.success : COLORS.danger }}>
                          {t.category_type === 'income' ? '+' : '-'} RM {t.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div style={emptyStateStyle}>
                <TrendingUp size={48} color={COLORS.textGray} style={{ opacity: 0.3, marginBottom: 16 }} />
                <p style={{ color: COLORS.textGray }}>No transactions found for the current filter.</p>
              </div>
            )}
          </>
        ) : <p style={{textAlign:'center', marginTop: 50}}>Loading Wallet...</p>}
      </div>

      {/* FLOATING ACTION BUTTON */}
      {currentWallet && (
          <button
              style={fabStyle}
              onClick={() => {
                  setEditingItem(null);
                  setEntryType('expense');
                  setNewEntry({
                      item: '', price: '', store: '',
                      date: new Date().toISOString().split('T')[0],
                      icon: '🛍️'
                  }); 
                  setShowAddModal(true);
              }}
              title="Add New Transaction"
          >
              <Plus size={28} />
          </button>
      )}

      {/* ADD/EDIT MODAL - The modal uses fixed position so it should always work well on mobile */}
      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalBoxStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: COLORS.textDark }}>
              {editingItem ? 'Edit' : 'Add'} Entry
            </h2>

            <div style={{ display: 'flex', background: COLORS.bg, padding: 6, borderRadius: 12, marginBottom: 24, width: 'fit-content' }}>
              <TabBtn label="Expense" active={entryType==='expense'} color={COLORS.danger} 
                onClick={() => { setEntryType('expense'); setNewEntry({...newEntry, icon: '🛍️'}) }} />
              <TabBtn label="Income" active={entryType==='income'} color={COLORS.success} 
                onClick={() => { setEntryType('income'); setNewEntry({...newEntry, icon: '💵'}) }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24, padding: '0 10px', overflowX: 'auto' }}>
              {(entryType === 'expense' ? expenseIcons : incomeIcons).map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewEntry({...newEntry, icon})}
                  style={{
                    fontSize: '20px',
                    borderRadius: '12px',
                    width:'50px',
                    minWidth: '50px',
                    height:'50px',
                    background: newEntry.icon === icon 
                      ? (entryType === 'income' ? COLORS.successLight : COLORS.dangerLight) 
                      : COLORS.white,
                    border: newEntry.icon === icon 
                      ? `3px solid ${entryType === 'income' ? COLORS.success : COLORS.danger}` 
                      : `2px solid ${COLORS.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: newEntry.icon === icon ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>

            <input placeholder="Item" value={newEntry.item} onChange={e=>setNewEntry({...newEntry, item:e.target.value})} style={modalInputStyle} />
            <input type="number" placeholder="Amount" value={newEntry.price} onChange={e=>setNewEntry({...newEntry, price:e.target.value})} style={modalInputStyle} />
            <input placeholder={entryType==='income'?"Source":"Store"} value={newEntry.store} onChange={e=>setNewEntry({...newEntry, store:e.target.value})} style={modalInputStyle} />
            <input type="date" value={newEntry.date} onChange={e=>setNewEntry({...newEntry, date:e.target.value})} style={{...modalInputStyle, marginBottom: 24}} />

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

// COMPONENTS & STYLES
const StatBox = ({ label, amount, color }) => (
  <div style={{ textAlign: 'center' }}>
    <p style={{ fontSize: '13px', color: COLORS.textGray, marginBottom: 4, textTransform: 'uppercase' }}>{label}</p>
    <p style={{ fontSize: '28px', fontWeight: '700', color }}>RM {Math.abs(amount).toFixed(2)}</p>
  </div>
)

const ViewBtn = ({ icon, active, onClick }) => (
  <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: 6, background: active ? COLORS.bg : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer' }}>
    {icon}
  </button>
)

const TypeBadge = ({ type }) => (
  <span style={{
    fontSize: 10, padding: '2px 8px', borderRadius: 4,
    background: type==='income' ? COLORS.successLight : COLORS.dangerLight,
    color: type==='income' ? COLORS.success : COLORS.danger,
    fontWeight: 700, textTransform: 'uppercase'
  }}>
    {type === 'income' ? 'IN' : 'OUT'}
  </span>
)

const TabBtn = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{ flex: 1, padding: 10, borderRadius: 6, background: active ? COLORS.white : 'transparent', color: active ? color : COLORS.textGray, fontWeight: 600, boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none' }}>
    {label}
  </button>
)

// --- NEW/MODIFIED STYLES FOR MOBILE UI ---
const summaryCardStyle = {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.success} 100%)`, 
    borderRadius: '16px',
    padding: '24px',
    color: COLORS.white,
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
    marginBottom: '24px',
};
const summaryTextStyle = { 
    fontSize: '13px', 
    fontWeight: '500', 
    opacity: 0.8 
};
const headerTitleStyle = {
    fontSize: '18px', 
    fontWeight: '700', 
    color: COLORS.textDark, 
    background: 'none', 
    border: 'none', 
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
};
const profileBtnStyle = {
    width: 36, height: 36, 
    borderRadius: '50%', 
    background: COLORS.bg, 
    border: `1px solid ${COLORS.border}`, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    cursor: 'pointer'
};
const fabStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    zIndex: 900
};

// Filter Grid Style (changes based on screen size, though inline styles are tricky)
const filterGridStyle = { 
    display: 'grid', 
    gridTemplateColumns: '1fr', // Mobile: Stacked columns
    gap: '12px', 
    marginBottom: '24px',
    '@media (min-width: 768px)': { // Desktop/Tablet overrides
        gridTemplateColumns: '3fr 1fr 1fr',
        gap: '16px',
    }
};

const inputStyle = { width: '100%', padding: '12px 12px 12px 44px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 14, outline: 'none', WebkitAppearance: 'none' }
const modalInputStyle = { width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: `1px solid ${COLORS.border}` }
const actionBtnStyle = { background: COLORS.primary, color: COLORS.white, border: 'none', borderRadius: 6, padding: '6px 12px', marginLeft: 8 }
const iconBtnStyle = { border: 'none', padding: 8, borderRadius: 6, background: COLORS.bg, cursor: 'pointer' }
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalBoxStyle = { background: COLORS.white, padding: 32, borderRadius: 16, width: '90%', maxWidth: 450, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }
const primaryBtnStyle = { flex: 1, padding: 14, color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }
const cancelBtnStyle = { flex: 1, padding: 14, background: COLORS.bg, color: COLORS.textDark, border: 'none', borderRadius: 8, fontWeight: 600 }
const emptyStateStyle = { textAlign: 'center', padding: '80px 20px', background: COLORS.white, borderRadius: '12px' }

// Transaction Styles (Simplified for mobile list view)
const mobileTableStyle = { width: '100%', borderCollapse: 'collapse', '@media (max-width: 767px)': { display: 'block' } };
const tableHeaderStyle = { background: '#FAFAFA', '@media (max-width: 767px)': { display: 'none' } }; // Hide headers on mobile
const tableRowStyle = { borderBottom: `1px solid ${COLORS.border}` };
const tableHeadCellStyle = (h) => ({ padding: '16px 24px', fontSize: '13px', textAlign: h==='Amount'?'right':'left', color: COLORS.textDark });
const tableCellDateStyle = { padding: '16px 24px', color: COLORS.textGray };
const tableCellItemStyle = { padding: '16px 24px' };
const tableCellDetailStyle = { padding: '16px 24px', color: COLORS.textGray };
const tableCellAmountStyle = (type) => ({ padding: '16px 24px', textAlign: 'right', fontWeight: '700', color: type==='income' ? COLORS.success : COLORS.danger });
const tableCellActionsStyle = { padding: '16px 24px', textAlign: 'right' };

const gridContainerStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const gridCardStyle = { background: COLORS.white, padding: '24px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, position: 'relative' };
const gridActionsStyle = { position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 };