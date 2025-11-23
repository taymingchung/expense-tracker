import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { API_URL } from '../config'
import { Upload, Search, Calendar, PiggyBank, Plus } from 'lucide-react'

export default function Dashboard() {
  const [expenses, setExpenses] = useState([])
  const [wallets, setWallets] = useState([])
  const [currentWallet, setCurrentWallet] = useState(null)
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showCreateWallet, setShowCreateWallet] = useState(false)
  const [newWalletName, setNewWalletName] = useState('')

  const loadWallets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get owned wallets
    const { data: owned } = await supabase
      .from('wallets')
      .select('id, name')
      .eq('owner_id', user.id)

    // Get shared wallets (including if you are member of your own wallet)
    const { data: shared } = await supabase
      .from('wallet_members')
      .select('wallets!inner(id, name)')
      .eq('user_id', user.id)

    const sharedWallets = shared?.map(m => ({ id: m.wallets.id, name: m.wallets.name })) || []

    // Merge and remove duplicates
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
    if (selected) localStorage.setItem('currentWalletId', selected.id)
  }

  const createWallet = async () => {
    if (!newWalletName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('wallets').insert({ name: newWalletName, owner_id: user.id }).select().single()
    if (data) {
      await supabase.from('wallet_members').insert({ wallet_id: data.id, user_id: user.id, role: 'owner' })
      setNewWalletName('')
      setShowCreateWallet(false)
      loadWallets()
    }
  }

  const fetchExpenses = async () => {
    if (!currentWallet) {
      setExpenses([])
      return
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token
    let url = `${API_URL}/expenses?wallet_id=${currentWallet.id}`
    if (search) url += `&search=${search}`
    if (month && year) url += `&month=${month}&year=${year}`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setExpenses(data || [])
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
    alert(json.success ? `Uploaded ${json.inserted} records to ${currentWallet.name}!` : json.error)
    setFile(null)
    fetchExpenses()
    setUploading(false)
  }

  useEffect(() => {
    loadWallets()
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [currentWallet, search, month, year])

  const total = expenses.reduce((sum, e) => sum + e.price, 0).toFixed(2)
  const grouped = expenses.reduce((acc, e) => {
    acc[e.item] = acc[e.item] || []
    acc[e.item].push(e)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        {/* 1. NO WALLET AT ALL — show welcome */}
        {wallets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{
              width: '160px',
              height: '160px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '50%',
              margin: '0 auto 40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(99,102,241,0.3)'
            }}>
              <PiggyBank size={80} color="white" />
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>
              Welcome to Expense Tracker
            </h2>
            <p style={{ fontSize: '18px', color: '#64748b', maxWidth: '600px', margin: '0 auto 40px' }}>
              Create your first wallet to start tracking expenses — Personal, Couple Fund, Travel, anything you want.
            </p>
            <button
              onClick={() => setShowCreateWallet(true)}
              style={{
                background: '#6366f1',
                color: 'white',
                padding: '18px 40px',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: '700',
                border: 'none',
                boxShadow: '0 10px 30px rgba(99,102,241,0.4)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <Plus size={28} />
              Create Your First Wallet
            </button>
          </div>
        )}

        {/* 2. WALLET SELECTED — show full dashboard */}
        {currentWallet && (
          <>
            {/* Upload Section */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '40px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Upload size={28} />
                Upload CSV to <span style={{ color: '#6366f1' }}>{currentWallet.name}</span>
              </h2>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setFile(e.target.files[0])}
                  style={{ flex: 1, minWidth: '280px', padding: '16px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '16px' }}
                />
                <button
                  onClick={handleUpload}
                  disabled={uploading || !file}
                  style={{
                    background: uploading || !file ? '#94a3b8' : '#6366f1',
                    color: 'white',
                    padding: '16px 32px',
                    borderRadius: '14px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: uploading || !file ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Upload size={22} />
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  placeholder="Search item..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '16px 16px 16px 50px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '16px' }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Calendar size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="number"
                  placeholder="Month (1-12)"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  style={{ width: '100%', padding: '16px 16px 16px 50px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '16px' }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Calendar size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="number"
                  placeholder="Year"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  style={{ width: '100%', padding: '16px 16px 16px 50px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '16px' }}
                />
              </div>
            </div>

            {/* Total Spent */}
            {month && year && (
              <div style={{
                textAlign: 'center',
                background: 'white',
                padding: '48px',
                borderRadius: '24px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                marginBottom: '40px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ fontSize: '20px', color: '#64748b', marginBottom: '12px' }}>
                  Total Spent in {month}/{year}
                </p>
                <p style={{ fontSize: '72px', fontWeight: '900', color: '#6366f1' }}>
                  RM {total}
                </p>
              </div>
            )}

            {/* Price Comparison Mode */}
            {search && Object.keys(grouped).length > 0 && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {Object.entries(grouped)
                  .filter(([item]) => item.toLowerCase().includes(search.toLowerCase()))
                  .map(([item, list]) => (
                    <div key={item} style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px', color: '#1e293b' }}>
                        {item} ({list.length} purchases)
                      </h3>
                      <div style={{ display: 'grid', gap: '16px' }}>
                        {list.sort((a, b) => a.price - b.price).map((e, i) => (
                          <div key={i} style={{
                            padding: '20px',
                            borderRadius: '16px',
                            background: i === 0 ? 'linear-gradient(to right, #ecfdf5, #d1fae5)' : '#f8fafc',
                            border: i === 0 ? '2px solid #10b981' : '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <p style={{ fontSize: '20px', fontWeight: i === 0 ? '700' : '600', color: i === 0 ? '#16a34a' : '#334155' }}>
                                {e.store || 'Unknown Store'}
                              </p>
                              <p style={{ color: '#94a3b8', fontSize: '14px' }}>{e.date}</p>
                            </div>
                            <p style={{ fontSize: '32px', fontWeight: '800', color: i === 0 ? '#16a34a' : '#334155' }}>
                              RM {e.price.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                      {list.length > 1 && (
                        <div style={{ marginTop: '24px', padding: '20px', background: '#ecfdf5', borderRadius: '16px', textAlign: 'center' }}>
                          <p style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
                            ✨ Cheapest at {list[0].store || 'this store'} → RM {list[0].price.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Recent Expenses Grid */}
            {!search && expenses.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {expenses.slice(0, 24).map(e => (
                  <div key={e.id} style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '28px',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0',
                    transition: '0.2s'
                  }}>
                    <p style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: '#1e293b' }}>
                      {e.item}
                    </p>
                    <p style={{ color: '#64748b', marginBottom: '12px' }}>
                      {e.store || '—'}
                    </p>
                    <p style={{ fontSize: '36px', fontWeight: '900', color: '#6366f1' }}>
                      RM {e.price.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '12px' }}>
                      {e.date}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* No expenses yet */}
            {currentWallet && expenses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                <PiggyBank size={80} color="#94a3b8" style={{ marginBottom: '24px' }} />
                <p style={{ fontSize: '24px', color: '#64748b' }}>
                  No expenses in {currentWallet.name} yet
                </p>
                <p style={{ color: '#94a3b8', marginTop: '12px' }}>
                  Upload your first CSV to get started!
                </p>
              </div>
            )}
          </>
        )}

        {/* Wallets exist but none selected */}
        {wallets.length > 0 && !currentWallet && (
          <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
            <WalletCards size={80} color="#94a3b8" style={{ marginBottom: '24px' }} />
            <p style={{ fontSize: '24px', color: '#64748b' }}>
              Select a wallet from the dropdown to view expenses
            </p>
          </div>
        )}
      </div>

      {/* Create Wallet Modal */}
      {showCreateWallet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={() => setShowCreateWallet(false)}>
          <div style={{ background: 'white', borderRadius: '32px', padding: '60px', width: '90%', maxWidth: '520px', boxShadow: '0 40px 80px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '36px', fontWeight: '900', textAlign: 'center', marginBottom: '40px', color: '#1e293b' }}>
              Create New Wallet
            </h2>
            <input
              value={newWalletName}
              onChange={e => setNewWalletName(e.target.value)}
              placeholder="e.g. Couple Fund, Personal, Travel 2026"
              style={{ width: '100%', padding: '24px', borderRadius: '20px', border: '3px solid #e2e8f0', fontSize: '20px', marginBottom: '40px' }}
              onKeyPress={e => e.key === 'Enter' && createWallet()}
            />
            <div style={{ display: 'flex', gap: '24px' }}>
              <button onClick={createWallet} style={{ flex: 1, padding: '24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '20px', fontSize: '20px', fontWeight: '800', boxShadow: '0 15px 35px rgba(99,102,241,0.4)' }}>
                Create Wallet
              </button>
              <button onClick={() => setShowCreateWallet(false)} style={{ flex: 1, padding: '24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '20px', fontSize: '20px', fontWeight: '700' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}