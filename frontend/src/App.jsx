import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Navbar from './components/Navbar'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen text-2xl">Loading...</div>

  return (
    <BrowserRouter>
      {session && <Navbar session={session} />}
      <Routes>
        <Route path="/" element={session ? <Dashboard /> : <Login />} />
        <Route path="/admin" element={session ? <Admin /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App