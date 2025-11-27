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
      delete: 'Delete permanently? All data will be lost.',
      make_admin: 'Make this user an admin?',
      remove_admin: 'Remove admin rights?',
      reset_password: 'Send password reset email?'
    }
    if (!confirm(msgs[action])) return

    setActionLoading(p => ({ ...p, [userId]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (action === 'reset_password') {
        const email = users.find(u => u.id === userId)?.email
        await supabase.auth.admin.generateLink({ type: 'recovery', email })
        alert('Password reset email sent!')
      } else {
        const res = await fetch(`${API_URL}/admin/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ user_id: userId, action })
        })
        if (!res.ok) throw new Error('Action failed')

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-6 bg-gray-50">
        <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-xl text-gray-600">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Admin Panel</h1>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              className="w-full pl-14 pr-6 py-4 bg-white border-2 border-gray-200 rounded-2xl text-lg shadow-lg focus:outline-none focus:border-blue-600 transition"
            />
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gray-50">
            <p className="text-gray-600 font-medium">
              Showing {paginated.length} of {filtered.length} users
            </p>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 hover:shadow-lg transition"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  <th className="px-8 py-6">User</th>
                  <th className="px-8 py-6">Name</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Role</th>
                  <th className="px-8 py-6">Joined</th>
                  <th className="px-8 py-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginated.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <Mail className="w-5 h-5 text-gray-500" />
                        <span className="font-semibold text-gray-900">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-gray-600">
                      {u.full_name || '—'}
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold ${u.is_blocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.is_blocked ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        {u.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold ${u.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                        <Shield className="w-4 h-4" />
                        {u.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-gray-600 text-sm">
                      {new Date(u.created_at).toLocaleDateString('en-MY')}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-3 justify-center">
                        {/* Block/Unblock */}
                        <button
                          onClick={() => handleAction(u.id, u.is_blocked ? 'unblock' : 'block')}
                          disabled={actionLoading[u.id]}
                          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition ${u.is_blocked ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} disabled:opacity-60`}
                        >
                          {actionLoading[u.id] ? '...' : u.is_blocked ? <><UserCheck className="w-4 h-4" /> Unblock</> : <><UserX className="w-4 h-4" /> Block</>}
                        </button>

                        {/* Admin Toggle */}
                        {u.is_admin ? (
                          <button
                            onClick={() => handleAction(u.id, 'remove_admin')}
                            disabled={actionLoading[u.id]}
                            className="px-5 py-3 bg-amber-100 text-amber-700 rounded-xl font-semibold text-sm hover:bg-amber-200 transition disabled:opacity-60"
                          >
                            Remove Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(u.id, 'make_admin')}
                            disabled={actionLoading[u.id]}
                            className="flex items-center gap-2 px-5 py-3 bg-blue-100 text-blue-700 rounded-xl font-semibold text-sm hover:bg-blue-200 transition disabled:opacity-60"
                          >
                            <Shield className="w-4 h-4" />
                            Make Admin
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => handleAction(u.id, 'reset_password')}
                          disabled={actionLoading[u.id]}
                          className="flex items-center gap-2 px-5 py-3 bg-cyan-100 text-cyan-700 rounded-xl font-semibold text-sm hover:bg-cyan-200 transition disabled:opacity-60"
                        >
                          <KeyRound className="w-4 h-4" />
                          Reset PW
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleAction(u.id, 'delete')}
                          disabled={actionLoading[u.id]}
                          className="flex items-center gap-2 px-5 py-3 bg-red-100 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-200 transition disabled:opacity-60"
                        >
                          {actionLoading[u.id] ? '...' : <Trash2 className="w-4 h-4" />}
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
            <div className="flex items-center justify-between px-8 py-6 bg-gray-50 border-t border-gray-200">
              <p className="text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-3 rounded-xl border-2 border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-5 py-3 rounded-xl font-semibold transition ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-3 rounded-xl border-2 border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}