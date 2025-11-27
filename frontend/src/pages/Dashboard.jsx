import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Plus, Edit2, Trash2, TrendingUp, LayoutGrid, List, Wallet, ChevronLeft, ChevronRight, Calendar, AlertTriangle } from 'lucide-react'

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

const ICON_MAP = {
  'Shopping': '🛍️', 'Food': '🍔', 'Transport': '🚗', 'Health': '🩺',
  'Education': '📚', 'Entertainment': '🎬', 'Travel': '✈️', 'Housing': '🏠',
  'Utilities': '⚡', 'Electronics':  '💻', 'Clothing': '👕', 'Coffee': '☕',
  'Events': '🎟️', 'Salary': '💵', 'Business': '💼', 'Invest': '📈', 'Bonus': '🎁'
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [wallets, setWallets] = useState([])
  const [currentWallet, setCurrentWallet] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [viewType, setViewType] = useState('list')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(false)

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [entryType, setEntryType] = useState('expense')
  const [newEntry, setNewEntry] = useState({
    item: '', price: '', store: '', date: new Date().toISOString().split('T')[0], icon: 'Shopping'
  })

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  // Load Wallets
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

  // Fetch Transactions
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
        const start = `${y}-${m}-01`

        let nextYear = parseInt(y)
        let nextMonth = parseInt(m) + 1
        
        if (nextMonth > 12) {
          nextMonth = 1
          nextYear++
        }

        const nextMonthStr = String(nextMonth).padStart(2, '0')
        const end = `${nextYear}-${nextMonthStr}-01`
        query = query.gte('date', start).lt('date', end)
      }
      if (selectedCategory) {
        const label = ICON_LABELS[selectedCategory]
        if (label) query = query.eq('category', label)
      }

      const { data, error } = await query
      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadWallets() }, [])
  useEffect(() => {
    const handleWalletChange = () => {
      const savedId = localStorage.getItem('currentWalletId')
      if (savedId && wallets.length > 0) {
        setCurrentWallet(wallets.find(w => w.id === savedId) || wallets[0])
      }
    }
    window.addEventListener('walletChanged', handleWalletChange)
    window.addEventListener('storage', handleWalletChange)
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange)
      window.removeEventListener('storage', handleWalletChange)
    }
  }, [wallets])
  useEffect(() => { fetchData() }, [currentWallet, search, selectedDate, selectedCategory])

  // Save/Edit
  const handleSaveEntry = async () => {
    if (!newEntry.item.trim() || !newEntry.price) return alert('Fill Item & Amount')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Login required')

    const payload = {
      wallet_id: currentWallet.id,
      user_id: user.id,
      item: newEntry.item,
      price: parseFloat(newEntry.price),
      store: newEntry.store || (entryType === 'income' ? 'Income' : 'Store'),
      date: newEntry.date,
      category: ICON_LABELS[newEntry.icon],
      category_type: entryType
    }

    try {
      if (editingItem) {
        await supabase.from('transactions').update(payload).eq('id', editingItem.id)
      } else {
        await supabase.from('transactions').insert(payload)
      }
      setShowAddModal(false)
      setEditingItem(null)
      setNewEntry({ item: '', price: '', store: '', date: new Date().toISOString().split('T')[0], icon: entryType === 'income' ? 'Salary' : 'Shopping' })
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  // --- DELETE LOGIC ---
  const promptDelete = (item) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const executeDelete = async () => {
    if (!itemToDelete) return
    try {
      await supabase.from('transactions').delete().eq('id', itemToDelete.id)
      fetchData()
      setShowDeleteModal(false)
      setItemToDelete(null)
    } catch (error) {
      console.error("Error deleting:", error)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setEntryType(item.category_type || 'expense')
    setNewEntry({
      item: item.item,
      price: item.price,
      store: item.store,
      date: item.date,
      icon: Object.keys(ICON_LABELS).find(k => ICON_LABELS[k] === item.category) || 'Shopping'
    })
    setShowAddModal(true)
  }

  // Calculations
  const totalIncome = transactions.filter(t => t.category_type === 'income').reduce((s, t) => s + t.price, 0)
  const totalExpense = transactions.filter(t => t.category_type !== 'income').reduce((s, t) => s + t.price, 0)
  const balance = totalIncome - totalExpense
  const totalVolume = totalIncome + totalExpense
  const incomePct = totalVolume === 0 ? 50 : (totalIncome / totalVolume) * 100

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Animated Background Blobs */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
        </div>

        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              {/* Month Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-100 rounded-xl font-bold text-gray-900 hover:bg-gray-200 transition"
                >
                  <Calendar className="w-5 h-5 opacity-60" />
                  {new Date(selectedDate + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                  <span className="ml-2 text-xs opacity-50">▼</span>
                </button>

                {showDatePicker && (
                  <>
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 w-72 z-50">
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setSelectedDate(prev => `${parseInt(prev.split('-')[0]) - 1}-${prev.split('-')[1]}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-lg">{selectedDate.split('-')[0]}</span>
                        <button onClick={() => setSelectedDate(prev => `${parseInt(prev.split('-')[0]) + 1}-${prev.split('-')[1]}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
                          const month = (i + 1).toString().padStart(2, '0')
                          const isActive = selectedDate.endsWith(month)
                          return (
                            <button
                              key={m}
                              onClick={() => { setSelectedDate(`${selectedDate.split('-')[0]}-${month}`); setShowDatePicker(false) }}
                              className={`py-2 rounded-lg font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                            >
                              {m}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                  </>
                )}
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Total Balance</p>
                  <h2 className="text-4xl font-bold mt-1">RM {balance.toFixed(2)}</h2>
                  <div className="flex gap-8 mt-6">
                    <div>
                      <div className="flex items-center gap-2 text-sm opacity-90">
                        <div className="w-2 h-2 bg-white rounded-full"></div> Income
                      </div>
                      <p className="text-xl font-bold mt-1">RM {totalIncome.toFixed(2)}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm opacity-90">
                        <div className="w-2 h-2 bg-white/50 rounded-full"></div> Expense
                      </div>
                      <p className="text-xl font-bold mt-1">RM {totalExpense.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="white" strokeWidth="4" strokeDasharray={`${incomePct}, 100`} className="transition-all duration-500" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">
                    {Math.round(incomePct)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
          {currentWallet ? (
            <>
              {/* Filters */}
              <div className="mb-6">
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex bg-white border border-gray-200 rounded-xl p-1">
                    <button onClick={() => setViewType('list')} className={`p-2 rounded-lg ${viewType === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>
                      <List className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewType('grid')} className={`p-2 rounded-lg ${viewType === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>
                      <LayoutGrid className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Category Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button onClick={() => setSelectedCategory('')} className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition ${selectedCategory === '' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'}`}>
                    All
                  </button>
                  {[...expenseIcons, ...incomeIcons].map(icon => (
                    <button
                      key={icon}
                      onClick={() => setSelectedCategory(selectedCategory === icon ? '' : icon)}
                      className={`px-5 py-2 rounded-full font-medium whitespace-nowrap flex items-center gap-2 transition ${selectedCategory === icon ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'}`}
                    >
                      <span className="text-lg">{icon}</span> {ICON_LABELS[icon]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions */}
              {loading ? (
                <p className="text-center text-gray-500 py-12">Loading...</p>
              ) : transactions.length > 0 ? (
                viewType === 'list' ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {transactions.map((t, i) => (
                      <div key={t.id} className={`flex items-center justify-between p-5 ${i !== transactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${t.category_type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {ICON_MAP[t.category] || t.category}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{t.item}</div>
                            <div className="text-sm text-gray-500">{formatDate(t.date)} • {t.store}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${t.category_type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.category_type === 'income' ? '+' : '-'} RM {t.price.toFixed(2)}
                          </div>
                          <div className="flex gap-3 mt-2 justify-end">
                            <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => promptDelete(t)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {transactions.map(t => (
                      <div key={t.id} className="bg-white rounded-2xl p-5 border border-gray-200 relative">
                        <div className="text-4xl mb-3">{ICON_MAP[t.category] || t.category}</div>
                        <div className="font-bold text-gray-900">{t.item}</div>
                        <div className="text-sm text-gray-500 mt-1">{formatDate(t.date)}</div>
                        <div className={`text-lg font-bold mt-3 ${t.category_type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {t.category_type === 'income' ? '+' : '-'} RM {t.price.toFixed(2)}
                        </div>
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button onClick={() => handleEdit(t)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => promptDelete(t)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                  <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No transactions found.</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-500 py-20">Loading wallets...</p>
          )}
        </main>

        {/* FAB */}
        {currentWallet && (
          <button
            onClick={() => {
              setEditingItem(null)
              setEntryType('expense')
              setNewEntry({ item: '', price: '', store: '', date: new Date().toISOString().split('T')[0], icon: 'Shopping' })
              setShowAddModal(true)
            }}
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition flex items-center justify-center z-50"
          >
            <Plus className="w-8 h-8" />
          </button>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingItem ? 'Edit' : 'Add'} Transaction</h2>

              {/* Type Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                <button onClick={() => { setEntryType('expense'); setNewEntry({...newEntry, icon: 'Shopping'}) }} className={`flex-1 py-3 rounded-lg font-semibold transition ${entryType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'}`}>
                  Expense
                </button>
                <button onClick={() => { setEntryType('income'); setNewEntry({...newEntry, icon: 'Salary'}) }} className={`flex-1 py-3 rounded-lg font-semibold transition ${entryType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600'}`}>
                  Income
                </button>
              </div>

              {/* Icons */}
              <div className="grid grid-cols-6 gap-3 mb-6">
                {(entryType === 'expense' ? expenseIcons : incomeIcons).map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewEntry({...newEntry, icon})}
                    className={`text-2xl py-3 rounded-xl border-2 transition ${newEntry.icon === icon ? (entryType === 'income' ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50') : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <input placeholder="Item name" value={newEntry.item} onChange={e => setNewEntry({...newEntry, item: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input type="number" placeholder="Amount (RM)" value={newEntry.price} onChange={e => setNewEntry({...newEntry, price: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input placeholder={entryType === 'income' ? 'Source' : 'Store / Location'} value={newEntry.store} onChange={e => setNewEntry({...newEntry, store: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />

              <div className="flex gap-3">
                <button onClick={handleSaveEntry} className={`flex-1 py-4 rounded-xl font-bold text-white transition ${entryType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  Save
                </button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-800 hover:bg-gray-200 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Transaction?</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to delete <span className="font-semibold text-gray-900">"{itemToDelete?.item}"</span>? This action cannot be undone.
                </p>
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setShowDeleteModal(false)} 
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeDelete} 
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
        .animate-blob { animation: blob 20s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}