import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { API_URL } from '../config'
import { Search, Calendar, PiggyBank, Plus, X, Edit2, Trash2, FileUp, TrendingUp, WalletCards } from 'lucide-react'

// Premium Sapphire Blue Palette
const SAPPHIRE_BLUE = "#2563EB";
const SAPPHIRE_LIGHT = "#DBEAFE";
const SAPPHIRE_DARK = "#1E40AF";
const SKY_BLUE = "#3B82F6";
const EMERALD_GREEN = "#10B981";
const RED_DANGER = "#EF4444";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F3F4F6";
const DARK_NAVY = "#1E3A8A";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const BORDER_LIGHT = "#E5E7EB";

export default function Dashboard() {
  const [expenses, setExpenses] = useState([])
  const [wallets, setWallets] = useState([])
  const [currentWallet, setCurrentWallet] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const fileInputRef = useRef(null)
  const [newExpense, setNewExpense] = useState({
    item: '',
    price: '',
    store: '',
    date: new Date().toISOString().split('T')[0],
    icon: '🛒'
  })

  const expenseIcons = ['🛒', '🍔', '🚗', '🏥', '📚', '🎬', '✈️', '🏠', '⚡', '💻', '👕', '🎮', '🌮', '☕', '🎫']

  const loadWallets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: owned } = await supabase
      .from('wallets')
      .select('id, name')
      .eq('owner_id', user.id)

    const { data: shared } = await supabase
      .from('wallet_members')
      .select('wallets!inner(id, name)')
      .eq('user_id', user.id)

    const sharedWallets = shared?.map(m => ({ id: m.wallets.id, name: m.wallets.name })) || []
    const walletMap = new Map()
    ;[...(owned || []), ...sharedWallets].forEach(w => {
      if (!walletMap.has(w.id)) {
        walletMap.set(w.id, w)
      }
    })
    const allWallets = Array.from(walletMap.values())
    setWallets(allWallets)

    const savedId = localStorage.getItem('currentWalletId')
    const selected = allWallets.find(w => w.id === savedId) || allWallets[0] || null
    setCurrentWallet(selected)
  }

  const fetchExpenses = async () => {
    if (!currentWallet) {
      setExpenses([])
      return
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token
    let url = `${API_URL}/expenses?wallet_id=${currentWallet.id}`
    if (search) url += `&search=${search}`
    if (selectedDate) {
      const [year, month] = selectedDate.split('-');
      url += `&month=${month}&year=${year}`;
    }

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setExpenses(data || [])
    } catch (err) {
      console.error("Fetch expenses error:", err)
    }
  }

  // Critical Fix: Listen to wallet changes from Navbar
  useEffect(() => {
    const handleWalletChange = () => {
      loadWallets()
    }
    window.addEventListener('walletChanged', handleWalletChange)
    window.addEventListener('storage', handleWalletChange)
    return () => {
      window.removeEventListener('walletChanged', handleWalletChange)
      window.removeEventListener('storage', handleWalletChange)
    }
  }, [])

  useEffect(() => {
    loadWallets()
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [currentWallet, search, selectedDate])

  const handleAddExpense = async () => {
    if (!newExpense.item.trim() || !newExpense.price || !currentWallet) {
      alert('Please fill in item name and price')
      return
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const url = editingExpense 
        ? `${API_URL}/expenses/${editingExpense.id}` 
        : `${API_URL}/expenses`
      const method = editingExpense ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          wallet_id: currentWallet.id,
          item: newExpense.item,
          price: parseFloat(newExpense.price),
          store: newExpense.store || 'Unknown Store',
          date: newExpense.date,
          icon: newExpense.icon
        })
      })

      if (res.ok) {
        alert(editingExpense ? 'Expense updated!' : 'Expense added!')
        setNewExpense({
          item: '',
          price: '',
          store: '',
          date: new Date().toISOString().split('T')[0],
          icon: '🛒'
        })
        setEditingExpense(null)
        setShowAddExpense(false)
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error saving expense:', error)
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const handleEditExpense = (expense) => {
    setEditingExpense(expense)
    setNewExpense({
      item: expense.item,
      price: expense.price.toString(),
      store: expense.store || '',
      date: expense.date,
      icon: expense.icon || '🛒'
    })
    setShowAddExpense(true)
  }

  const handleUpload = async () => {
    if (!file || !currentWallet) return
    setUploading(true)
    const token = (await supabase.auth.getSession()).data.session.access_token
    const formData = new FormData()
    formData.append('file', file)
    formData.append('wallet_id', currentWallet.id)

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    const json = await res.json()
    alert(json.success ? `Uploaded ${json.inserted} records!` : json.error)
    setFile(null)
    setShowUploadModal(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchExpenses()
    setUploading(false)
  }

  const total = expenses.reduce((sum, e) => sum + e.price, 0).toFixed(2)
  const grouped = expenses.reduce((acc, e) => {
    acc[e.item] = acc[e.item] || []
    acc[e.item].push(e)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: '#FAFBFC', padding: '24px 0', paddingBottom: '48px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>

        {wallets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              background: `linear-gradient(135deg, ${SAPPHIRE_BLUE}, ${SKY_BLUE})`,
              borderRadius: '20px',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 20px 50px rgba(37, 99, 235, 0.2)`
            }}>
              <PiggyBank size={50} color="white" />
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: '700', color: TEXT_DARK, marginBottom: '12px' }}>
              Welcome to ExpenseTracker
            </h2>
            <p style={{ fontSize: '16px', color: TEXT_MUTED, maxWidth: '500px', margin: '0 auto 32px' }}>
              Start tracking your expenses by creating your first wallet
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: `linear-gradient(135deg, ${SAPPHIRE_BLUE}, ${SKY_BLUE})`,
                color: 'white',
                padding: '12px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                boxShadow: `0 10px 25px rgba(37, 99, 235, 0.3)`,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={20} />
              Create First Wallet
            </button>
          </div>
        )}

        {currentWallet && (
          <>
            {/* Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '28px'
            }}>
              <button
                onClick={() => setShowUploadModal(true)}
                style={{
                  background: SAPPHIRE_BLUE,
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = DARK_NAVY)}
                onMouseLeave={(e) => (e.currentTarget.style.background = SAPPHIRE_BLUE)}
              >
                <FileUp size={18} />
                Upload CSV
              </button>
              <button
                onClick={() => {
                  setEditingExpense(null)
                  setNewExpense({
                    item: '',
                    price: '',
                    store: '',
                    date: new Date().toISOString().split('T')[0],
                    icon: '🛒'
                  })
                  setShowAddExpense(true)
                }}
                style={{
                  background: EMERALD_GREEN,
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Plus size={18} />
                Add Expense
              </button>
            </div>

            {/* Filters */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '12px', 
              marginBottom: '28px' 
            }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
                <input
                  placeholder="Search items..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '11px 12px 11px 40px', 
                    borderRadius: '8px', 
                    border: `1.5px solid ${BORDER_LIGHT}`, 
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '11px 12px 11px 40px', 
                    borderRadius: '8px', 
                    border: `1.5px solid ${BORDER_LIGHT}`, 
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            {/* Total Card */}
            {selectedDate && (
              <div style={{
                background: `linear-gradient(135deg, ${SAPPHIRE_BLUE}, ${SKY_BLUE})`,
                color: 'white',
                padding: '32px 24px',
                borderRadius: '16px',
                marginBottom: '28px',
                boxShadow: `0 10px 30px rgba(37, 99, 235, 0.15)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>
                    Total Spent
                  </p>
                  <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                    {selectedDate}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '42px', fontWeight: '700', letterSpacing: '-0.5px' }}>
                    RM {total}
                  </p>
                </div>
              </div>
            )}

            {/* Price Comparison */}
            {search && Object.keys(grouped).length > 0 && (
              <div style={{ display: 'grid', gap: '16px', marginBottom: '28px' }}>
                {Object.entries(grouped)
                  .filter(([item]) => item.toLowerCase().includes(search.toLowerCase()))
                  .map(([item, list]) => (
                    <div key={item} style={{ background: WHITE, borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: `1px solid ${BORDER_LIGHT}` }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: TEXT_DARK }}>
                        {item} <span style={{ color: TEXT_MUTED, fontWeight: '500' }}>({list.length})</span>
                      </h3>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {list.sort((a, b) => a.price - b.price).map((e, i) => (
                          <div key={i} style={{
                            padding: '14px',
                            borderRadius: '8px',
                            background: i === 0 ? '#ECFDF5' : LIGHT_GRAY,
                            border: i === 0 ? `1.5px solid ${EMERALD_GREEN}` : `1px solid ${BORDER_LIGHT}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: i === 0 ? '600' : '500', color: i === 0 ? EMERALD_GREEN : TEXT_DARK }}>
                                {e.store || 'Unknown Store'}
                              </p>
                              <p style={{ color: TEXT_MUTED, fontSize: '12px' }}>{e.date}</p>
                            </div>
                            <p style={{ fontSize: '18px', fontWeight: '700', color: i === 0 ? EMERALD_GREEN : TEXT_DARK }}>
                              RM {e.price.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Expenses Grid */}
            {!search && expenses.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                {expenses.slice(0, 24).map(e => (
                  <div key={e.id} style={{
                    background: WHITE,
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    border: `1px solid ${BORDER_LIGHT}`,
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}>
                    {/* Action Buttons */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleEditExpense(e)}
                        style={{
                          background: SAPPHIRE_BLUE,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          fontFamily: 'inherit'
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        style={{
                          background: RED_DANGER,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          fontFamily: 'inherit'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p style={{ fontSize: '40px', marginBottom: '12px', marginTop: '12px' }}>
                      {e.icon || '🛒'}
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: TEXT_DARK }}>
                      {e.item}
                    </p>
                    <p style={{ color: TEXT_MUTED, marginBottom: '12px', fontSize: '13px' }}>
                      {e.store || 'Unknown'}
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: SAPPHIRE_BLUE, marginBottom: '8px' }}>
                      RM {e.price.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: TEXT_MUTED }}>
                      {e.date}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {currentWallet && expenses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: WHITE, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: `1px solid ${BORDER_LIGHT}` }}>
                <TrendingUp size={48} color={TEXT_MUTED} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p style={{ fontSize: '18px', fontWeight: '600', color: TEXT_DARK, marginBottom: '8px' }}>
                  No expenses yet
                </p>
                <p style={{ color: TEXT_MUTED, fontSize: '14px' }}>
                  Start by uploading a CSV or adding your first expense
                </p>
              </div>
            )}
          </>
        )}

        {wallets.length > 0 && !currentWallet && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: WHITE, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: `1px solid ${BORDER_LIGHT}` }}>
            <WalletCards size={48} color={TEXT_MUTED} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', fontWeight: '600', color: TEXT_DARK }}>
              Select a wallet from the top menu
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '16px'
        }} onClick={() => setShowUploadModal(false)}>
          <div style={{
            background: WHITE,
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: TEXT_DARK, margin: 0 }}>
                Upload CSV File
              </h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: TEXT_MUTED, padding: 0 }}>
                ×
              </button>
            </div>
            {/* DOWNLOAD SAMPLE CSV BUTTON - ADD THIS */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: TEXT_MUTED, marginBottom: '12px' }}>
                Not sure how to format your file?
              </p>
              <button
                onClick={() => {
                  const csvContent = `date,item,price,store,category
                        2025-04-01,Starbucks Coffee,12.50,Starbucks,beverages
                        2025-04-02,Grab Ride to Office,18.00,Grab,transport
                        2025-04-03,Chicken Rice Lunch,8.50,Hawker Centre,food
                        2025-04-04,Netflix Subscription,49.00,,entertainment`;

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', 'expense-tracker-sample.csv');
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                style={{
                  background: 'transparent',
                  color: SAPPHIRE_BLUE,
                  border: `2px dashed ${SAPPHIRE_BLUE}`,
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = SAPPHIRE_LIGHT;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <FileUp size={18} />
                Download Sample CSV
              </button>
            </div>

            <div
              style={{
                border: `2px dashed ${SAPPHIRE_BLUE}`,
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                background: SAPPHIRE_LIGHT,
                cursor: 'pointer',
                marginBottom: '24px',
                transition: 'all 0.2s'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp size={40} color={SAPPHIRE_BLUE} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '16px', fontWeight: '600', color: TEXT_DARK, marginBottom: '4px' }}>
                Choose a file
              </p>
              <p style={{ color: TEXT_MUTED, fontSize: '13px' }}>
                or drag and drop
              </p>
              {file && (
                <p style={{ marginTop: '12px', color: EMERALD_GREEN, fontWeight: '600', fontSize: '13px' }}>
                  ✓ {file.name}
                </p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files[0])}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                style={{
                  padding: '12px',
                  background: uploading || !file ? TEXT_MUTED : SAPPHIRE_BLUE,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: uploading || !file ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  padding: '12px',
                  background: LIGHT_GRAY,
                  color: TEXT_DARK,
                  border: `1px solid ${BORDER_LIGHT}`,
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      {showAddExpense && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }} onClick={() => setShowAddExpense(false)}>
          <div style={{
            background: WHITE,
            borderRadius: '16px',
            padding: '28px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: TEXT_DARK, margin: 0 }}>
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button onClick={() => setShowAddExpense(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: TEXT_MUTED, padding: 0 }}>
                ×
              </button>
            </div>

            {/* Icon Selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: TEXT_MUTED, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(45px, 1fr))', gap: '10px' }}>
                {expenseIcons.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewExpense({ ...newExpense, icon })}
                    style={{
                      fontSize: '28px',
                      borderRadius: '8px',
                      border: newExpense.icon === icon ? `2px solid ${SAPPHIRE_BLUE}` : `2px solid ${BORDER_LIGHT}`,
                      background: newExpense.icon === icon ? SAPPHIRE_LIGHT : LIGHT_GRAY,
                      cursor: 'pointer',
                      transition: '0.2s',
                      fontFamily: 'inherit'
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={newExpense.item}
              onChange={e => setNewExpense({ ...newExpense, item: e.target.value })}
              placeholder="Item description"
              style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: `1.5px solid ${BORDER_LIGHT}`, fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <input
              type="number"
              value={newExpense.price}
              onChange={e => setNewExpense({ ...newExpense, price: e.target.value })}
              placeholder="Amount (RM)"
              step="0.01"
              style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: `1.5px solid ${BORDER_LIGHT}`, fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <input
              value={newExpense.store}
              onChange={e => setNewExpense({ ...newExpense, store: e.target.value })}
              placeholder="Store (optional)"
              style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: `1.5px solid ${BORDER_LIGHT}`, fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <input
              type="date"
              value={newExpense.date}
              onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
              style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: `1.5px solid ${BORDER_LIGHT}`, fontSize: '14px', marginBottom: '24px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button onClick={handleAddExpense} style={{ padding: '12px', background: SAPPHIRE_BLUE, color: WHITE, border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                {editingExpense ? 'Update' : 'Add'}
              </button>
              <button onClick={() => setShowAddExpense(false)} style={{ padding: '12px', background: LIGHT_GRAY, color: TEXT_DARK, border: `1px solid ${BORDER_LIGHT}`, borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
      `}</style>
    </div>
  )
}