    import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSales, getExpenses, getLiveRates } from '../services/sheets.js'

const GOAL = 4500

export default function Home() {
  const navigate = useNavigate()
  const [stats, setStats]   = useState({ revenue: 0, expenses: 0, margin: 0, budget: 0 })
  const [recent, setRecent] = useState([])
  const [flags, setFlags]   = useState([])
  const [chat, setChat]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sales, expenses] = await Promise.all([getSales(), getExpenses()])
        const now = new Date()
        const month = now.getMonth()
        const year  = now.getFullYear()

        const monthlySales = sales.filter(s => {
          const d = new Date(s.Date)
          return d.getMonth() === month && d.getFullYear() === year
        })
        const monthlyExp = expenses.filter(e => {
          const d = new Date(e.Date)
          return d.getMonth() === month && d.getFullYear() === year
        })

        const revenue  = monthlySales.reduce((s, r) => s + parseFloat(r['Sale Price (CAD)'] || 0), 0)
        const expTotal = monthlyExp.reduce((s, r) => s + parseFloat(r['Amount (CAD)'] || 0), 0)
        const profit   = revenue - expTotal
        const margin   = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
        const budget   = Math.max(0, Math.round(profit * 0.2))

        setStats({ revenue, expenses: expTotal, margin, budget })

        const flagged = sales.filter(s => !s['Sale Price (CAD)'] || s['Sale Price (CAD)'] === '')
        setFlags(flagged)

        const allRecent = [
          ...monthlySales.map(s => ({ type: 'sell', name: s['Plant Name'], meta: s.Channel, amount: parseFloat(s['Sale Price (CAD)'] || 0), payment: s.Payment })),
          ...monthlyExp.map(e => ({ type: 'expense', name: e.Description || e.Category, meta: e.Category, amount: parseFloat(e['Amount (CAD)'] || 0) }))
        ].slice(0, 5)
        setRecent(allRecent)
      } catch (err) {
        console.error('Failed to load sheet data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleChat(e) {
    e.preventDefault()
    if (!chat.trim()) return
    // Parse intent and navigate to the right add screen
    const lower = chat.toLowerCase()
    if (lower.includes('sold') || lower.includes('sale')) navigate('/inventory?action=sell&prefill=' + encodeURIComponent(chat))
    else if (lower.includes('bought') || lower.includes('buy') || lower.includes('received')) navigate('/inventory?action=buy&prefill=' + encodeURIComponent(chat))
    else if (lower.includes('fee') || lower.includes('expense') || lower.includes('shipping')) navigate('/expenses?prefill=' + encodeURIComponent(chat))
    else navigate('/inventory?action=add&prefill=' + encodeURIComponent(chat))
    setChat('')
  }

  const goalPct = Math.min(100, Math.round((stats.revenue / GOAL) * 100))

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:500 }}>Plant P&L</div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{new Date().toLocaleString('en-CA', { month:'long', year:'numeric' })}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, fontWeight:500, padding:'4px 10px', borderRadius:20, border:'0.5px solid #e5e5e5', color:'#666' }}>CAD</span>
          <button onClick={() => navigate('/settings')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#999', padding:2 }} title="Settings">⚙️</button>
        </div>
      </div>

      {/* FLAG BAR */}
      {flags.length > 0 && (
        <div onClick={() => navigate('/inventory?filter=flagged')} style={{ margin:'12px 16px', background:'#FAEEDA', borderLeft:'3px solid #EF9F27', padding:'10px 14px', borderRadius:'0 8px 8px 0', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <span style={{ fontSize:14 }}>⚑</span>
          <span style={{ fontSize:13, color:'#633806', flex:1 }}>{flags.length} {flags.length === 1 ? 'entry' : 'entries'} missing price — tap to review</span>
          <span style={{ fontSize:13, fontWeight:500, color:'#854F0B' }}>{flags.length} →</span>
        </div>
      )}

      {/* GOAL BAR */}
      <div style={{ margin:'0 16px 14px', padding:'10px 14px', background:'#f5f5f5', borderRadius:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, color:'#666' }}>Monthly goal: CA${GOAL.toLocaleString()}</span>
          <span style={{ fontSize:12, fontWeight:500 }}>{goalPct}%</span>
        </div>
        <div style={{ height:5, background:'#e5e5e5', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${goalPct}%`, background: goalPct >= 100 ? '#1D9E75' : goalPct >= 60 ? '#c8824a' : '#A32D2D', borderRadius:3, transition:'width 0.3s' }} />
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, padding:'0 16px', marginBottom:20 }}>
        {[
          { label:'Revenue', value:`$${Math.round(stats.revenue).toLocaleString()}`, sub:'this month', color:'#1D9E75' },
          { label:'Expenses', value:`$${Math.round(stats.expenses).toLocaleString()}`, sub:'this month', color:'#1a1a1a' },
          { label:'Margin', value:`${stats.margin}%`, sub:'avg this month', color: stats.margin >= 40 ? '#1D9E75' : '#BA7517' },
          { label:'Budget left', value:`$${stats.budget.toLocaleString()}`, sub:'for new plants', color:'#BA7517' },
        ].map(s => (
          <div key={s.label} style={{ background:'#f5f5f5', borderRadius:8, padding:14 }}>
            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:500, color: loading ? '#ccc' : s.color }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* QUICK LINKS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, padding:'0 16px', marginBottom:20 }}>
        {[
          { label:'Suppliers', icon:'🌏', path:'/suppliers' },
          { label:'Shows', icon:'🎪', path:'/shows' },
          { label:'Expenses', icon:'🧾', path:'/expenses' },
          { label:'Reconcile', icon:'🏦', path:'/expenses?tab=reconcile' },
        ].map(q => (
          <button key={q.path} onClick={() => navigate(q.path)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:500, color:'#1a1a1a' }}>
            <span style={{ fontSize:18 }}>{q.icon}</span>{q.label}
          </button>
        ))}
      </div>

      {/* RECENT */}
      <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10 }}>Recent</div>
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {loading ? (
          <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>Loading…</div>
        ) : recent.length === 0 ? (
          <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>No entries yet this month</div>
        ) : recent.map((r, i) => (
          <div key={i} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: r.type === 'sell' ? '#1D9E75' : r.type === 'buy' ? '#378ADD' : '#A32D2D' }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{r.name}</div>
              <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{r.meta}{r.payment ? ` · ${r.payment}` : ''}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:500, color: r.type === 'sell' ? '#1D9E75' : '#A32D2D' }}>
              {r.type === 'sell' ? '+' : '−'}CA${Math.round(r.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* CHAT INPUT */}
      <div style={{ position:'fixed', bottom:64, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'0.5px solid #e5e5e5', padding:'10px 12px 12px', zIndex:20 }}>
        <div style={{ display:'flex', gap:6, marginBottom:8, overflowX:'auto', scrollbarWidth:'none' }}>
          {['sold hoya $95 show', 'bought 3 alocasia IDR 450k', 'show fee $140'].map(s => (
            <button key={s} onClick={() => setChat(s)} style={{ padding:'5px 11px', borderRadius:20, background:'#f5f5f5', color:'#666', border:'0.5px solid #e5e5e5', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>{s}</button>
          ))}
        </div>
        <form onSubmit={handleChat} style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button type="button" onClick={() => navigate('/inventory?action=add')} style={{ width:38, height:38, borderRadius:'50%', background:'#f5f5f5', border:'0.5px solid #e5e5e5', cursor:'pointer', fontSize:20, color:'#666', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
          <input
            value={chat}
            onChange={e => setChat(e.target.value)}
            placeholder="Type what happened…"
            style={{ flex:1, padding:'10px 14px', border:'0.5px solid #e5e5e5', borderRadius:24, fontSize:14, fontFamily:'inherit', background:'#f5f5f5', outline:'none', color:'#1a1a1a' }}
          />
          <button type="submit" style={{ width:38, height:38, borderRadius:'50%', background:'#1D9E75', border:'none', cursor:'pointer', fontSize:16, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>→</button>
        </form>
      </div>
    </div>
  )
}

    
