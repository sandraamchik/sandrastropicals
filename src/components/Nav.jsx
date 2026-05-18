// src/components/Nav.jsx
// Shared navigation components used across all screens

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const NAV = [
  { path:'/',          icon:'🏠', label:'Home'      },
  { path:'/pl',        icon:'📊', label:'P&L'       },
  { path:'/inventory', icon:'🌿', label:'Inventory' },
  { path:'/insights',  icon:'💡', label:'Insights'  },
  { path:'/shows',     icon:'🎪', label:'Shows'     },
]

// ── TOP BAR ───────────────────────────────────────────────────────────────────
export function TopBar({ title, subtitle, right, showBack = false }) {
  const navigate = useNavigate()
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'14px 16px 12px',
      borderBottom:'0.5px solid #e5e5e5',
      position:'sticky', top:0, background:'#fff', zIndex:50
    }}>
      {showBack && (
        <button onClick={() => navigate(-1)} style={{
          background:'none', border:'none', cursor:'pointer',
          fontSize:22, color:'#999', padding:'0 4px 0 0',
          display:'flex', alignItems:'center', flexShrink:0,
          minWidth:36, minHeight:36
        }}>‹</button>
      )}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:18, fontWeight:500, color:'#1a1a1a' }}>{title}</div>
        {subtitle && <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ flexShrink:0 }}>{right}</div>}
    </div>
  )
}

// ── BOTTOM NAV ────────────────────────────────────────────────────────────────
export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <nav style={{
      position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:480,
      background:'#fff', borderTop:'0.5px solid #e5e5e5',
      display:'flex', padding:'8px 0 16px', zIndex:100
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
            <span style={{ fontSize:10, color: active?'#1D9E75':'#999', fontWeight: active?600:400 }}>{n.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ── FAB (Floating Action Button) ──────────────────────────────────────────────
export function FAB({ onPress, label = '+' }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={onPress || (() => navigate('?add=true'))}
      style={{
        position:'fixed',
        bottom:80,
        right:'max(16px, calc(50% - 240px + 16px))',
        width:60, height:60,
        borderRadius:'50%',
        background:'#1D9E75',
        color:'#fff',
        border:'none',
        cursor:'pointer',
        fontSize:28,
        fontWeight:300,
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        boxShadow:'0 4px 16px rgba(29,158,117,0.4)',
        zIndex:90,
        transition:'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.08)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(29,158,117,0.5)' }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(29,158,117,0.4)' }}
    >
      {label}
    </button>
  )
}

// ── SECTION TITLE ─────────────────────────────────────────────────────────────
export function SectionTitle({ children, style }) {
  return (
    <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10, marginTop:4, ...style }}>
      {children}
    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'#f5f5f5', borderRadius:8, padding:14 }}>
      <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:500, color: color||'#1a1a1a' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12,
      padding:'12px 14px', cursor: onClick?'pointer':'default',
      transition: onClick?'background 0.1s':'none',
      ...style
    }}
    onMouseEnter={e => onClick && (e.currentTarget.style.background='#f9f9f9')}
    onMouseLeave={e => onClick && (e.currentTarget.style.background='#fff')}
    >
      {children}
    </div>
  )
}

// ── ADD BUTTON (dashed) ───────────────────────────────────────────────────────
export function AddButton({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'13px 16px', border:'0.5px dashed #ccc', borderRadius:12,
      background:'none', cursor:'pointer', fontSize:14, color:'#999',
      width:'100%', textAlign:'left',
      display:'flex', alignItems:'center', gap:10,
      transition:'background 0.1s'
    }}
    onMouseEnter={e => e.currentTarget.style.background='#f5f5f5'}
    onMouseLeave={e => e.currentTarget.style.background='none'}
    >
      <span style={{ fontSize:20, color:'#1D9E75', fontWeight:300 }}>+</span>
      <span>{label}</span>
    </button>
  )
}

// ── PILL BUTTON ───────────────────────────────────────────────────────────────
export function Pill({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:500,
      cursor:'pointer', whiteSpace:'nowrap',
      border: active ? 'none' : '0.5px solid #e5e5e5',
      background: active ? (color||'#1a1a1a') : '#fff',
      color: active ? '#fff' : '#666',
      minHeight:36
    }}>
      {label}
    </button>
  )
}

// ── FORM FIELD ────────────────────────────────────────────────────────────────
export function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ fontSize:12, color:'#999', marginBottom:7, display:'block' }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:11, color:'#bbb', marginTop:5 }}>{hint}</div>}
    </div>
  )
}

export function Input({ value, onChange, type='text', placeholder='', required=false, min, step, style }) {
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} required={required}
      min={min} step={step}
      style={{
        width:'100%', padding:'11px 13px',
        border:'0.5px solid #e5e5e5', borderRadius:9,
        fontSize:15, fontFamily:'inherit',
        color:'#1a1a1a', background:'#fff',
        outline:'none', minHeight:44,
        ...style
      }}
    />
  )
}

export function Select({ value, onChange, children, style }) {
  return (
    <select value={value} onChange={onChange} style={{
      width:'100%', padding:'11px 13px',
      border:'0.5px solid #e5e5e5', borderRadius:9,
      fontSize:15, fontFamily:'inherit',
      color:'#1a1a1a', background:'#fff',
      outline:'none', minHeight:44,
      ...style
    }}>
      {children}
    </select>
  )
}

// ── PRIMARY BUTTON ────────────────────────────────────────────────────────────
export function PrimaryButton({ children, onClick, disabled, style, color }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%', padding:15,
      background: disabled ? '#ccc' : (color||'#1D9E75'),
      color:'#fff', border:'none', borderRadius:12,
      fontSize:16, fontWeight:500, cursor: disabled?'default':'pointer',
      minHeight:50, transition:'opacity 0.15s',
      ...style
    }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.opacity='0.9')}
    onMouseLeave={e => (e.currentTarget.style.opacity='1')}
    >
      {children}
    </button>
  )
}
