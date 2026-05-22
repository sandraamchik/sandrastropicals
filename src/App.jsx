    import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { loadGoogleAuth, isSignedIn, signIn } from './services/auth.js'

// Lazy load all components to isolate any render errors
import Home from './components/Home.jsx'
import PL from './components/PL.jsx'
import Inventory from './components/Inventory.jsx'
import Insights from './components/Insights.jsx'
import Shows from './components/Shows.jsx'
import Suppliers from './components/Suppliers.jsx'
import Expenses from './components/Expenses.jsx'
import Settings from './components/Settings.jsx'
import Import from './components/Import.jsx'

const NAV = [
  { path:'/',          icon:'🏠', label:'Home'      },
  { path:'/pl',        icon:'📊', label:'P&L'       },
  { path:'/inventory', icon:'🌿', label:'Inventory' },
  { path:'/insights',  icon:'💡', label:'Insights'  },
  { path:'/shows',     icon:'🎪', label:'Shows'     },
]

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <nav style={{
      position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480, background:'#fff',
      borderTop:'0.5px solid #e5e5e5', display:'flex',
      padding:'8px 0 16px', zIndex:100
    }}>
      {NAV.map(n => {
        const active = location.pathname === n.path
        return (
          <button key={n.path} onClick={() => navigate(n.path)} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            gap:3, background:'none', border:'none', cursor:'pointer',
            padding:'4px 0', minHeight:44
          }}>
            <span style={{ fontSize:20 }}>{n.icon}</span>
            <span style={{ fontSize:10, color:active?'#1D9E75':'#999', fontWeight:active?600:400 }}>{n.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// Error boundary to catch render errors
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error:null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:24, fontFamily:'Arial, sans-serif' }}>
          <div style={{ fontSize:16, fontWeight:500, color:'#A32D2D', marginBottom:8 }}>Something went wrong</div>
          <div style={{ fontSize:13, color:'#666', marginBottom:16 }}>{this.state.error.message}</div>
          <button onClick={() => this.setState({ error:null })} style={{ padding:'10px 20px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14 }}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}

function Layout({ children }) {
  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh' }}>
      <div style={{ paddingBottom:80 }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
      <BottomNav />
    </div>
  )
}

function SignInScreen({ onSignIn }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  async function handleSignIn() {
    setLoading(true); setError('')
    try { await signIn(); onSignIn() }
    catch(e) { setError('Sign in failed. Please try again.') }
    finally { setLoading(false) }
  }
  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, textAlign:'center', fontFamily:'Arial, sans-serif' }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🌿</div>
      <div style={{ fontSize:24, fontWeight:500, marginBottom:8 }}>Sandra's Tropicals</div>
      <div style={{ fontSize:14, color:'#999', marginBottom:40, lineHeight:1.6 }}>Sign in with your Google account to access your plant business dashboard.</div>
      <button onClick={handleSignIn} disabled={loading} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 24px', background:'#fff', border:'1.5px solid #e5e5e5', borderRadius:12, fontSize:15, fontWeight:500, cursor:'pointer', color:'#1a1a1a', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.5 20-21 0-1.3-.2-2.7-.5-4z"/>
          <path fill="#34A853" d="M6.3 14.7l7 5.1C15.2 16 19.3 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.7 0-14.3 4.4-17.7 11.7z"/>
          <path fill="#FBBC05" d="M24 45c5.5 0 10.4-1.8 14.2-4.9l-6.6-5.4C29.6 36.4 27 37 24 37c-6 0-10.6-3.9-11.8-9.4l-7 5.4C8 40.5 15.4 45 24 45z"/>
          <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.9-2.9 5.3-5.5 6.9l6.6 5.4C41.2 37.3 44.5 31.2 44.5 24c0-1.3-.2-2.7-.5-4z"/>
        </svg>
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <div style={{ marginTop:16, fontSize:13, color:'#A32D2D' }}>{error}</div>}
      <div style={{ marginTop:32, fontSize:12, color:'#ccc', lineHeight:1.6 }}>Your data stays in your own Google Sheet.</div>
    </div>
  )
}

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const [signedIn,  setSignedIn]  = useState(false)

  useEffect(() => {
    loadGoogleAuth()
      .then(() => { setAuthReady(true); setSignedIn(isSignedIn()) })
      .catch(() => setAuthReady(true))
  }, [])

  if (!authReady) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontSize:14, color:'#999', fontFamily:'Arial, sans-serif' }}>
      Loading…
    </div>
  )

  if (!signedIn) return <SignInScreen onSignIn={() => setSignedIn(true)} />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Layout><Home onSignOut={() => setSignedIn(false)} /></Layout>} />
        <Route path="/pl"        element={<Layout><PL /></Layout>} />
        <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
        <Route path="/insights"  element={<Layout><Insights /></Layout>} />
        <Route path="/shows"     element={<Layout><Shows /></Layout>} />
        <Route path="/suppliers" element={<Layout><Suppliers /></Layout>} />
        <Route path="/expenses"  element={<Layout><Expenses /></Layout>} />
        <Route path="/settings"  element={<Layout><Settings onSignOut={() => setSignedIn(false)} /></Layout>} />
        <Route path="/import"    element={<Layout><Import /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

    
