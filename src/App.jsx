    import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './components/Home.jsx'
import PL from './components/PL.jsx'
import Inventory from './components/Inventory.jsx'
import Insights from './components/Insights.jsx'
import Shows from './components/Shows.jsx'
import Suppliers from './components/Suppliers.jsx'
import Expenses from './components/Expenses.jsx'
import Settings from './components/Settings.jsx'

const NAV = [
  { path: '/',          icon: '🏠', label: 'Home'      },
  { path: '/pl',        icon: '📊', label: 'P&L'       },
  { path: '/inventory', icon: '🌿', label: 'Inventory' },
  { path: '/insights',  icon: '💡', label: 'Insights'  },
  { path: '/shows',     icon: '🎪', label: 'Shows'     },
]

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#fff', borderTop: '0.5px solid #e5e5e5',
      display: 'flex', padding: '8px 0 14px', zIndex: 100,
      maxWidth: 480, margin: '0 auto'
    }}>
      {NAV.map(n => {
        const active = location.pathname === n.path
        return (
          <button key={n.path} onClick={() => navigate(n.path)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0'
          }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            <span style={{
              fontSize: 10,
              color: active ? '#1D9E75' : '#999',
              fontWeight: active ? 600 : 400
            }}>{n.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function Layout({ children }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      <div style={{ paddingBottom: 80 }}>{children}</div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/pl" element={<Layout><PL /></Layout>} />
        <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
        <Route path="/insights" element={<Layout><Insights /></Layout>} />
        <Route path="/shows" element={<Layout><Shows /></Layout>} />
        <Route path="/suppliers" element={<Layout><Suppliers /></Layout>} />
        <Route path="/expenses" element={<Layout><Expenses /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

    
