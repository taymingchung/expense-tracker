import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Mail, Lock, Wallet, ArrowRight, Loader2 } from 'lucide-react'

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
    
    if (error) {
      alert(error.message)
    }
    setLoading(false)
  }

  const signInWithGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  return (
    <div className="login-container">
      {/* INJECTED CSS STYLES */}
      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #0f172a;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* Animated Background Blobs */
        .blob {
          position: absolute;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.6;
          animation: float 10s infinite ease-in-out;
        }
        .blob-1 { top: -10%; left: -10%; width: 500px; height: 500px; background: #4f46e5; animation-delay: 0s; }
        .blob-2 { bottom: -10%; right: -10%; width: 400px; height: 400px; background: #ec4899; animation-delay: 2s; }
        .blob-3 { top: 40%; left: 40%; width: 300px; height: 300px; background: #06b6d4; animation-delay: 4s; }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }

        /* Glass Card */
        .glass-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .logo-box {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 10px 25px rgba(59, 130, 246, 0.5); 
        }

        h1 { color: white; font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 8px 0; }
        .subtitle { color: #94a3b8; text-align: center; font-size: 15px; margin-bottom: 32px; }

        /* Inputs */
        .input-group { position: relative; margin-bottom: 16px; }
        .input-icon { 
          position: absolute; 
          left: 16px; 
          top: 50%; 
          transform: translateY(-50%); 
          color: #94a3b8; 
          transition: color 0.3s;
        }
        .input-field {
          width: 100%;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 14px 14px 48px;
          color: white;
          font-size: 15px;
          outline: none;
          transition: all 0.3s;
        }
        .input-field::placeholder { color: #475569; }
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
          background: rgba(15, 23, 42, 0.8);
        }
        .input-group:focus-within .input-icon { color: #3b82f6; }

        /* Buttons */
        .btn-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.5);
        }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 24px 0;
          color: #64748b;
          font-size: 13px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .divider span { padding: 0 12px; }

        .btn-google {
          width: 100%;
          background: white;
          color: #1e293b;
          border: none;
          padding: 12px;
          border-radius: 12px;
          font-weight: 500;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s;
        }
        .btn-google:hover { background: #f1f5f9; }

        .toggle-text {
          text-align: center;
          margin-top: 24px;
          color: #94a3b8;
          font-size: 14px;
        }
        .toggle-btn {
          background: none;
          border: none;
          color: #60a5fa;
          font-weight: 600;
          cursor: pointer;
          margin-left: 5px;
        }
        .toggle-btn:hover { text-decoration: underline; color: #93c5fd; }
      `}</style>

      {/* Background Shapes */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      {/* Main Card */}
      <div className="glass-card">
        <div style={{ textAlign: 'center' }}>
          <div className="logo-box">
            <Wallet color="white" size={32} strokeWidth={2.5} />
          </div>
          <h1>{isSignUp ? 'Create Account' : 'FinTracka'}</h1>
          <p className="subtitle">
            {isSignUp ? 'Start tracking your expenses today' : 'Track your money. Control your life.'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth}>
          <div className="input-group">
            <Mail size={20} className="input-icon" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="Email address"
            />
          </div>
          
          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                {isSignUp ? 'Sign Up' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="divider">
          <span>OR CONTINUE WITH</span>
        </div>

        <button onClick={signInWithGoogle} className="btn-google">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>

        <p className="toggle-text">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button className="toggle-btn" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}