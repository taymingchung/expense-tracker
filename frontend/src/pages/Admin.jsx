import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { API_URL } from '../config'

export default function Admin() {
  const [users, setUsers] = useState([])

  const fetchUsers = async () => {
    const token = (await supabase.auth.getSession()).data.session.access_token
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    setUsers(data)
  }

  const handleAction = async (user_id, action) => {
    const token = (await supabase.auth.getSession()).data.session.access_token
    await fetch(`${API_URL}/admin/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id, action })
    })
    fetchUsers()
  }

  useEffect(() => { fetchUsers() }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold mb-8">Admin Panel – Manage Users</h1>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-purple-600 text-white">
            <tr>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Joined</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-4">{u.email}</td>
                <td className="p-4">{u.full_name || '—'}</td>
                <td className="p-4">{u.is_blocked ? 'Blocked' : 'Active'}</td>
                <td className="p-4">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                  {!u.is_blocked ? (
                    <button onClick={() => handleAction(u.id, 'block')} className="bg-orange-600 text-white px-4 py-2 rounded mr-2">Block</button>
                  ) : (
                    <button onClick={() => handleAction(u.id, 'unblock')} className="bg-green-600 text-white px-4 py-2 rounded mr-2">Unblock</button>
                  )}
                  <button onClick={() => handleAction(u.id, 'delete')} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}