import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }   // ← THIS WAS MISSING!

  const signInWithGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)' }}>
      <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '50px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '80px', height: '80px', background: 'linear-gradient(to bottom right, #3b82f6, #8b5cf6)', borderRadius: '20px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '40px' }}>
            💰
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>Expense Tracker</h1>
          <p style={{ color: '#64748b' }}>Track spending · Compare prices · Save smarter</p>
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <span className="input-icon" style={{ fontSize: '20px' }}>📧</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
            />
          </div>
          <div style={{ position: 'relative' }}>
            <span className="input-icon" style={{ fontSize: '20px' }}>🔒</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ fontSize: '16px' }}>
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* BEAUTIFUL "OR" SEPARATOR */}
        <div style={{ margin: '40px 0', textAlign: 'center', position: 'relative', height: '20px' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid #e2e8f0' }}></div>
          <span style={{ background: 'rgba(255,255,255,0.85)', padding: '0 20px', color: '#94a3b8', fontSize: '14px', position: 'relative', zIndex: 1 }}>
            Or
          </span>
        </div>

        {/* PERFECTLY CENTERED GOOGLE BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={signInWithGoogle} className="btn-google" style={{ width: '100%', maxWidth: '320px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* CLEAN SIGN UP TEXT (NO BOX) */}
        <p style={{ textAlign: 'center', marginTop: '30px', color: '#64748b', fontSize: '15px' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#3b82f6', fontWeight: '600', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
            {isSignUp ? 'Sign In' : 'Sign Up Free'}
          </button>
        </p>
      </div>
    </div>
  )
}