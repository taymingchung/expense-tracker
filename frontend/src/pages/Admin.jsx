import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { API_URL } from '../config'
import { 
  Trash2, UserX, UserCheck, RefreshCw, Mail, User, Clock, 
  Shield, KeyRound, Search, ChevronLeft, ChevronRight 
} from 'lucide-react'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      alert('Error loading users')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (userId, action) => {
    const msgs = {
      block: 'Block user?',
      unblock: 'Unblock user?',
      delete: 'Delete permanently? All data lost.',
      make_admin: 'Make admin?',
      remove_admin: 'Remove admin?',
      reset_password: 'Send password reset email?'
    }
    if (!confirm(msgs[action])) return

    setActionLoading(p => ({ ...p, [userId]: true }))

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (action === 'reset_password') {
        const email = users.find(u => u.id === userId)?.email
        await supabase.auth.admin.generateLink({ type: 'recovery', email })
        alert('Reset email sent!')
      } else {
        const res = await fetch(`${API_URL}/admin/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ user_id: userId, action })
        })
        if (!res.ok) throw new Error('Failed')

        setUsers(prev => prev.map(u => {
          if (u.id === userId) {
            if (action === 'block' || action === 'unblock') return { ...u, is_blocked: action === 'block' }
            if (action === 'make_admin' || action === 'remove_admin') return { ...u, is_admin: action === 'make_admin' }
          }
          return u
        }))

        if (action === 'delete') {
          setUsers(prev => prev.filter(u => u.id !== userId))
        }
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setActionLoading(p => ({ ...p, [userId]: false }))
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / usersPerPage)
  const paginated = filtered.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <RefreshCw size={40} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />
      <p style={{ fontSize: '18px', color: '#64748b' }}>Loading users...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>
            Admin Panel
          </h1>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '500px', marginBottom: '32px' }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              style={{
                width: '100%',
                padding: '14px 20px 14px 52px',
                borderRadius: '16px',
                border: '2px solid #e2e8f0',
                background: 'white',
                fontSize: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        {/* Table Card */}
        <div style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {/* Top Bar */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>
              Showing {paginated.length} of {filtered.length} users
            </p>
            <button
              onClick={fetchUsers}
              style={{
                padding: '12px 28px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
              }}
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '20px', textAlign: 'left', fontWeight: '700', color: '#334155', fontSize: '14px' }}>USER</th>
                  <th style={{ padding: '20px', textAlign: 'left', fontWeight: '700', color: '#334155', fontSize: '14px' }}>NAME</th>
                  <th style={{ padding: '20px', textAlign: 'left', fontWeight: '700', color: '#334155', fontSize: '14px' }}>STATUS</th>
                  <th style={{ padding: '20px', textAlign: 'left', fontWeight: '700', color: '#334155', fontSize: '14px' }}>ROLE</th>
                  <th style={{ padding: '20px', textAlign: 'left', fontWeight: '700', color: '#334155', fontSize: '14px' }}>JOINED</th>
                  <th style={{ padding: '20px', textAlign: 'center', fontWeight: '700', color: '#334155', fontSize: '14px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(u => (
                  <tr key={u.id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: 'white',
                    transition: 'background 0.2s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '24px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Mail size={20} style={{ color: '#64748b' }} />
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{u.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: '24px 20px', color: '#475569' }}>
                      {u.full_name || '—'}
                    </td>
                    <td style={{ padding: '24px 20px' }}>
                      <span style={{
                        padding: '10px 20px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: u.is_blocked ? '#fee2e2' : '#ecfdf5',
                        color: u.is_blocked ? '#dc2626' : '#16a34a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {u.is_blocked ? <UserX size={16} /> : <UserCheck size={16} />}
                        {u.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '24px 20px' }}>
                      {u.is_admin ? (
                        <span style={{
                          padding: '10px 20px',
                          background: '#fef3c7',
                          color: '#f59e0b',
                          borderRadius: '999px',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          minWidth: '110px' 
                        }}>
                          <Shield size={16} />
                          Admin
                        </span>
                      ) : (
                        <span style={{
                          padding: '10px 20px',
                          background: '#fef3c7',
                          color: '#0369a1',
                          borderRadius: '999px',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          minWidth: '110px'
                        }}>
                          <Shield size={16} />
                          User
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '24px 20px', color: '#64748b', fontSize: '14px' }}>
                      {new Date(u.created_at).toLocaleDateString('en-MY')}
                    </td>
                    <td style={{ padding: '24px 20px' }}>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {/* Block/Unblock */}
                        <button
                          onClick={() => handleAction(u.id, u.is_blocked ? 'unblock' : 'block')}
                          disabled={actionLoading[u.id]}
                          style={{
                            padding: '10px 20px',
                            background: u.is_blocked ? '#ecfdf5' : '#fef2f2',
                            color: u.is_blocked ? '#16a34a' : '#dc2626',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: actionLoading[u.id] ? 'not-allowed' : 'pointer',
                            opacity: actionLoading[u.id] ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            minWidth: '120px'
                          }}
                        >
                          {actionLoading[u.id] ? ('...') : 
                          (
                            <>
                              {u.is_blocked ? (
                                <>
                                  <UserCheck size={18} />
                                  Unblock
                                </>
                              ) : (
                                <>
                                  <UserX size={18} />
                                  Block
                                </>
                              )}
                            </>
                          )}
                        </button>

                        {/* Make/Remove Admin */}
                        {!u.is_admin ? (
                          <button
                            onClick={() => handleAction(u.id, 'make_admin')}
                            disabled={actionLoading[u.id]}
                            style={{
                              padding: '10px 20px',
                              background: '#dbeafe',
                              color: '#2563eb',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '600',
                              fontSize: '14px',
                              cursor: 'pointer',
                              opacity: actionLoading[u.id] ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Shield size={16} />
                            Make Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(u.id, 'remove_admin')}
                            disabled={actionLoading[u.id]}
                            style={{
                              padding: '10px 20px',
                              background: '#fef3c7',
                              color: '#d97706',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '600',
                              fontSize: '14px',
                              cursor: 'pointer',
                              opacity: actionLoading[u.id] ? 0.6 : 1
                            }}
                          >
                            Remove Admin
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => handleAction(u.id, 'reset_password')}
                          disabled={actionLoading[u.id]}
                          style={{
                            padding: '10px 20px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            opacity: actionLoading[u.id] ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <KeyRound size={16} />
                          Reset PW
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleAction(u.id, 'delete')}
                          disabled={actionLoading[u.id]}
                          style={{
                            padding: '10px 20px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            opacity: actionLoading[u.id] ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {actionLoading[u.id] ? '...' : <Trash2 size={16} />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0'
            }}>
              <p style={{ color: '#64748b', fontSize: '15px' }}>
                Page {currentPage} of {totalPages}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '10px 16px',
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={20} />
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{
                      padding: '10px 18px',
                      background: currentPage === i + 1 ? '#2563eb' : 'white',
                      color: currentPage === i + 1 ? 'white' : '#334155',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '10px 16px',
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}