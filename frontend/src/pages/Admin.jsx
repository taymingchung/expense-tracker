import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { API_URL } from '../config'
import { Trash2, UserCheck, UserX, Clock, Mail, User } from 'lucide-react'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = (await supabase.auth.getSession()).data.session.access_token
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleAction = async (user_id, action) => {
    try {
      const token = (await supabase.auth.getSession()).data.session.access_token
      const res = await fetch(`${API_URL}/admin/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id, action })
      })
      if (!res.ok) throw new Error('Action failed')
      fetchUsers()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
    <div style={{ fontSize: '24px', color: '#64748b' }}>Loading users...</div>
  </div>

  if (error) return <div style={{ textAlign: 'center', padding: '40px' }}>
    <p style={{ color: '#ef4444', fontSize: '18px' }}>Error: {error}</p>
    <button onClick={fetchUsers} style={{ padding: '12px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
      Retry
    </button>
  </div>

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b' }}>
            Admin Panel
          </h1>
          <button onClick={fetchUsers} style={{ padding: '12px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>

        {/* Users Table */}
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '20px 16px', textAlign: 'left', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>Email</th>
                  <th style={{ padding: '20px 16px', textAlign: 'left', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>Name</th>
                  <th style={{ padding: '20px 16px', textAlign: 'left', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                  <th style={{ padding: '20px 16px', textAlign: 'left', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>Joined</th>
                  <th style={{ padding: '20px 16px', textAlign: 'left', fontWeight: '700', color: '#1e293b', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '20px 16px', color: '#334155' }}>{u.email}</td>
                    <td style={{ padding: '20px 16px', color: '#334155' }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '20px 16px' }}>
                      <span style={{ 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '14px', 
                        fontWeight: '600',
                        background: u.is_blocked ? '#fef2f2' : '#ecfdf5',
                        color: u.is_blocked ? '#dc2626' : '#16a34a'
                      }}>
                        {u.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 16px', color: '#64748b' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '20px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!u.is_blocked ? (
                          <button
                            onClick={() => handleAction(u.id, 'block')}
                            style={{ 
                              padding: '8px 16px', 
                              background: '#fef2f2', 
                              color: '#dc2626', 
                              border: 'none', 
                              borderRadius: '8px', 
                              fontSize: '14px', 
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: '0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                          >
                            Block
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(u.id, 'unblock')}
                            style={{ 
                              padding: '8px 16px', 
                              background: '#ecfdf5', 
                              color: '#16a34a', 
                              border: 'none', 
                              borderRadius: '8px', 
                              fontSize: '14px', 
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: '0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#d1fae5'}
                          >
                            Unblock
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(u.id, 'delete')}
                          style={{ 
                            padding: '8px 16px', 
                            background: '#fef2f2', 
                            color: '#dc2626', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontSize: '14px', 
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: '0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div style={{ padding: '80px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', color: '#64748b' }}>No users yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}