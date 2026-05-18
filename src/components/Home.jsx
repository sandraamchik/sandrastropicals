import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSales, getExpenses } from '../services/sheets.js'
import { TopBar, SectionTitle, StatCard, FAB } from './Nav.jsx'

const GOAL = parseFloat(localStorage.getItem('goal') || '4500')

export default function Home({ onSignOut }) {
  const navigate = useNavigate()
  const [stats, setStats]     = useState({ revenue:0, expenses:0, margin:0, budget:0 })
  const [recent, setRecent]   = useState([])
  const [flags, setFlags]     = useState([])
  const [chat, setChat]       = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [sales, expenses] = await Promise.all([getSales(), getExpenses()])
        const now = new Date()
        const m = now.getMonth(), y = now.getFullYear()
        const ms = sales.filter(s => { const d=new Date(s.Date); return d.getMonth()===m && d.getFullYear()===y })
        const me = expenses.filter(e => { const d=new Date(e.Date); return d.getMonth()===m && d.getFullYear()===y })
        const revenue  = ms.reduce((s,r) => s+parseFloat(r['Sale Price (CAD)']||0), 0)
        const expTotal = me.reduce((s,r) => s+parseFloat(r['Amount (CAD)']||0), 0)
        const profit   = revenue - expTotal
        const margin   = revenue>0 ? Math.round((profit/revenue)*100) : 0
        const budget   = Math.max(0, Math.round(profit*0.2))
        setStats({ revenue, expenses:expTotal, margin, budget })
        setFlags(ms.filter(s => !s['Sale Price (CAD)']))
        setRecent([
          ...ms.map(s => ({ type:'sell', name:s['Plant Name'], meta:s.Channel, amount:parseFloat(s['Sale Price (CAD)']||0), payment:s.Payment })),
          ...me.map(e => ({ type:'expense', name:e.Description||e.Category, meta:e.Category, amount:parseFloat(e['Amount (CAD)']||0) }))
        ].slice(0,5))
      } catch(err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const goalPct = Math.min(100, Math.round((stats.revenue/GOAL)*100))

  function handleChat(e) {
    e.preventDefault()
    if (!chat.trim()) return
    const lower = chat.toLowerCase()
    if (lower.includes('sold')||lower.includes('sale')) navigate('/inventory?action=sell&prefill='+encodeURIComponent(chat))
    else if (lower.includes('bought')||lower.includes('buy')) navigate('/inventory?action=buy&prefill='+encodeURIComponent(chat))
    else if (lower.includes('fee')||lower.includes('expense')||lower.includes('shipping')) navigate('/expenses?prefill='+encodeURIComponent(chat))
    else navigate('/inventory?action=add&prefill='+encodeURIComponent(chat))
    setChat('')
  }

  return (
    <div style={{ fontFamily:'inherit', paddingBottom:160 }}>
      <TopBar
        title="Plant P&L"
        subtitle={new Date().toLocaleString('en-CA',{month:'long',year:'numeric'})}
        right={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, fontWeight:500, padding:'4px 10px', borderRadius:20, border:'0.5px solid #e5e5e5', color:'#666' }}>CAD</span>
            <button onClick={() => navigate('/settings')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#999', padding:4, minWidth:36, minHeight:36, display:'flex', alignItems:'center', justifyContent:'center' }}>⚙️</button>
          </div>
        }
      />

      {/* Flag bar */}
      {flags.length > 0 && (
        <div onClick={() => navigate('/inventory?filter=flagged')} style={{ margin:'12px 16px', background:'#FAEEDA', borderLeft:'3px solid #EF9F27', padding:'10px 14px', borderRadius:'0 8px 8px 0', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <span>⚑</span>
          <span style={{ fontSize:13, color:'#633806', flex:1 }}>{flags.length} {flags.length===1?'entry':'entries'} missing price</span>
          <span style={{ fontSize:13, fontWeight:500, color:'#854F0B' }}>{flags.length} →</span>
        </div>
      )}

      {/* Goal bar */}
      <div style={{ margin:'0 16px 14px', padding:'10px 14px', background:'#f5f5f5', borderRadius:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, color:'#666' }}>Goal: CA${GOAL.toLocaleString()}</span>
          <span style={{ fontSize:12, fontWeight:500 }}>{goalPct}%</span>
        </div>
        <div style={{ height:5, background:'#e5e5e5', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${goalPct}%`, background:goalPct>=100?'#1D9E75':goalPct>=60?'#c8824a':'#A32D2D', borderRadius:3 }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, padding:'0 16px', marginBottom:20 }}>
        <StatCard label="Revenue"    value={loading?'—':`CA$${Math.round(stats.revenue).toLocaleString()}`}   sub="this month" color="#1D9E75" />
        <StatCard label="Expenses"   value={loading?'—':`CA$${Math.round(stats.expenses).toLocaleString()}`}  sub="this month" />
        <StatCard label="Margin"     value={loading?'—':`${stats.margin}%`}  sub="avg this month" color={stats.margin>=40?'#1D9E75':'#BA7517'} />
        <StatCard label="Budget left" value={loading?'—':`CA$${stats.budget.toLocaleString()}`} sub="for new plants" color="#BA7517" />
      </div>

      {/* Quick links */}
      <SectionTitle>Quick access</SectionTitle>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, padding:'0 16px', marginBottom:20 }}>
        {[
          { label:'Suppliers', icon:'🌏', path:'/suppliers' },
          { label:'Shows',     icon:'🎪', path:'/shows'     },
          { label:'Expenses',  icon:'🧾', path:'/expenses'  },
          { label:'Settings',  icon:'⚙️', path:'/settings'  },
        ].map(q => (
          <button key={q.path} onClick={() => navigate(q.path)} style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 14px', background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, cursor:'pointer', fontSize:14, fontWeight:500, color:'#1a1a1a', minHeight:50 }}>
            <span style={{ fontSize:20 }}>{q.icon}</span>{q.label}
          </button>
        ))}
      </div>

      {/* Recent */}
      <SectionTitle>Recent</SectionTitle>
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {loading ? <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>Loading…</div>
        : recent.length===0 ? <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>No entries yet this month</div>
        : recent.map((r,i) => (
          <div key={i} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:r.type==='sell'?'#1D9E75':'#A32D2D' }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{r.name}</div>
              <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{r.meta}{r.payment?` · ${r.payment}`:''}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:500, color:r.type==='sell'?'#1D9E75':'#A32D2D' }}>
              {r.type==='sell'?'+':'−'}CA${Math.round(r.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* Chat input */}
      <div style={{ position:'fixed', bottom:64, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'0.5px solid #e5e5e5', padding:'10px 12px 12px', zIndex:20 }}>
        <div style={{ display:'flex', gap:6, marginBottom:8, overflowX:'auto', scrollbarWidth:'none' }}>
          {['sold hoya $95 show','bought 3 alocasia IDR 450k','show fee $140'].map(s => (
            <button key={s} onClick={() => setChat(s)} style={{ padding:'5px 11px', borderRadius:20, background:'#f5f5f5', color:'#666', border:'0.5px solid #e5e5e5', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>{s}</button>
          ))}
        </div>
        <form onSubmit={handleChat} style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button type="button" onClick={() => navigate('/expenses?add=true')} style={{ width:44, height:44, borderRadius:'50%', background:'#1D9E75', border:'none', cursor:'pointer', fontSize:24, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(29,158,117,0.3)' }}>+</button>
          <input value={chat} onChange={e=>setChat(e.target.value)} placeholder="Type what happened…" style={{ flex:1, padding:'10px 14px', border:'0.5px solid #e5e5e5', borderRadius:24, fontSize:14, fontFamily:'inherit', background:'#f5f5f5', outline:'none', color:'#1a1a1a', minHeight:44 }} />
          <button type="submit" style={{ width:44, height:44, borderRadius:'50%', background:'#1D9E75', border:'none', cursor:'pointer', fontSize:18, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>→</button>
        </form>
      </div>
    </div>
  )
}
