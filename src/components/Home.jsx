    import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSales, getExpenses, addSale, addExpense } from '../services/sheets.js'

const GOAL = parseFloat(localStorage.getItem('goal') || '4500')

const CHANNELS = ['Show','Website','Instagram','Facebook','Exact plant','Other']
const PAYMENTS = ['💵 Cash','💳 Card','📲 E-transfer','🛍 Shopify']
const EXP_CATS = ['Show / event fee','Shipping & import','Clearance broker','Supplies','Gas & travel','Other']

export default function Home({ onSignOut }) {
  const navigate = useNavigate()
  const [stats, setStats]     = useState({ revenue:0, expenses:0, margin:0 })
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'sale' | 'expense' | 'chat'
  const [chat, setChat]       = useState('')

  // Sale form
  const [sale, setSale] = useState({
    name:'', amount:'', channel:'Show', payment:'💵 Cash', cash:'Yes', notes:'', date: new Date().toISOString().slice(0,10)
  })
  // Expense form
  const [exp, setExp] = useState({
    category:'Show / event fee', amount:'', description:'', date: new Date().toISOString().slice(0,10)
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [sales, expenses] = await Promise.all([getSales(), getExpenses()])
      const now = new Date()
      const m = now.getMonth(), y = now.getFullYear()
      const ms = sales.filter(s => { const d=new Date(s.Date); return d.getMonth()===m&&d.getFullYear()===y })
      const me = expenses.filter(e => { const d=new Date(e.Date); return d.getMonth()===m&&d.getFullYear()===y })
      const revenue  = ms.reduce((s,r)=>s+parseFloat(r['Sale Price (CAD)']||0),0)
      const expTotal = me.reduce((s,r)=>s+parseFloat(r['Amount (CAD)']||0),0)
      const profit   = revenue-expTotal
      const margin   = revenue>0?Math.round((profit/revenue)*100):0
      setStats({ revenue, expenses:expTotal, margin })
      setRecent([
        ...ms.slice(-3).map(s=>({ type:'sale', name:s['Plant Name']||'Sale', meta:`${s.Channel||''}${s.Payment?' · '+s.Payment:''}`, amount:parseFloat(s['Sale Price (CAD)']||0) })),
        ...me.slice(-2).map(e=>({ type:'expense', name:e.Description||e.Category, meta:e.Category, amount:parseFloat(e['Amount (CAD)']||0) }))
      ].slice(-5))
    } catch(err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleSaveSale(e) {
    e.preventDefault()
    if (!sale.name || !sale.amount) return
    setSaving(true)
    try {
      await addSale([
        sale.date, sale.name, '', 1, parseFloat(sale.amount),
        '', '', '', sale.channel, '',
        sale.payment, sale.payment==='💵 Cash'?'Yes':'No', '', sale.notes
      ])
      setSaved(true)
      setModal(null)
      setSale({ name:'', amount:'', channel:'Show', payment:'💵 Cash', notes:'', date:new Date().toISOString().slice(0,10) })
      setTimeout(() => { setSaved(false); loadData() }, 500)
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function handleSaveExpense(e) {
    e.preventDefault()
    if (!exp.amount) return
    setSaving(true)
    try {
      await addExpense([exp.date, exp.category, parseFloat(exp.amount), exp.description, '', ''])
      setSaved(true)
      setModal(null)
      setExp({ category:'Show / event fee', amount:'', description:'', date:new Date().toISOString().slice(0,10) })
      setTimeout(() => { setSaved(false); loadData() }, 500)
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const goalPct = Math.min(100, Math.round((stats.revenue/GOAL)*100))

  const s = { fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }

  function Opt({ label, value, current, onClick }) {
    return (
      <button type="button" onClick={onClick} style={{ padding:'8px 14px', borderRadius:20, fontSize:13, cursor:'pointer', border:'0.5px solid #e5e5e5', background:current===value?'#1a1a1a':'#fff', color:current===value?'#fff':'#666', minHeight:36 }}>{label}</button>
    )
  }

  function ModalSheet({ title, onClose, children }) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div style={{ background:'#fff', borderRadius:'16px 16px 0 0', padding:'0 0 32px', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff' }}>
            <div style={{ fontSize:17, fontWeight:500 }}>{title}</div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#999', padding:4 }}>✕</button>
          </div>
          <div style={{ padding:'16px' }}>{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...s, paddingBottom:160 }}>

      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff', zIndex:50 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:500 }}>Plant P&L</div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{new Date().toLocaleString('en-CA',{month:'long',year:'numeric'})}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, border:'0.5px solid #e5e5e5', color:'#666' }}>CAD</span>
          <button onClick={() => navigate('/settings')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, padding:4, minWidth:36, minHeight:36 }}>⚙️</button>
        </div>
      </div>

      {/* GOAL BAR */}
      <div style={{ margin:'12px 16px', padding:'10px 14px', background:'#f5f5f5', borderRadius:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, color:'#666' }}>Goal: CA${GOAL.toLocaleString()}</span>
          <span style={{ fontSize:12, fontWeight:500 }}>{goalPct}%</span>
        </div>
        <div style={{ height:5, background:'#e5e5e5', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${goalPct}%`, background:goalPct>=100?'#1D9E75':goalPct>=60?'#c8824a':'#A32D2D', borderRadius:3 }} />
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, padding:'0 16px', marginBottom:20 }}>
        {[
          { label:'Revenue',  value:`CA$${Math.round(stats.revenue).toLocaleString()}`,  color:'#1D9E75' },
          { label:'Expenses', value:`CA$${Math.round(stats.expenses).toLocaleString()}`, color:'#1a1a1a' },
          { label:'Margin',   value:`${stats.margin}%`, color:stats.margin>=40?'#1D9E75':'#BA7517' },
          { label:'Left for plants', value:`CA$${Math.max(0,Math.round((stats.revenue-stats.expenses)*0.2)).toLocaleString()}`, color:'#BA7517' },
        ].map(s => (
          <div key={s.label} style={{ background:'#f5f5f5', borderRadius:8, padding:14 }}>
            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:500, color: loading?'#ccc':s.color }}>{loading?'—':s.value}</div>
          </div>
        ))}
      </div>

      {/* QUICK ADD */}
      <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10 }}>Quick add</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, padding:'0 16px', marginBottom:20 }}>
        {[
          { label:'Log a sale',    icon:'💸', action:() => setModal('sale')    },
          { label:'Log expense',   icon:'🧾', action:() => setModal('expense') },
          { label:'Import data',   icon:'📥', action:() => navigate('/import') },
          { label:'Suppliers',     icon:'🌏', action:() => navigate('/suppliers') },
        ].map(q => (
          <button key={q.label} onClick={q.action} style={{ display:'flex', alignItems:'center', gap:10, padding:'14px', background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, cursor:'pointer', fontSize:14, fontWeight:500, color:'#1a1a1a', minHeight:52 }}>
            <span style={{ fontSize:20 }}>{q.icon}</span>{q.label}
          </button>
        ))}
      </div>

      {/* RECENT */}
      <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10 }}>Recent</div>
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {loading ? <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>Loading…</div>
        : recent.length===0 ? <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>No entries yet this month — tap Log a sale to start</div>
        : recent.map((r,i) => (
          <div key={i} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:r.type==='sale'?'#1D9E75':'#A32D2D' }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{r.name}</div>
              <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{r.meta}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:500, color:r.type==='sale'?'#1D9E75':'#A32D2D' }}>
              {r.type==='sale'?'+':'−'}CA${Math.round(r.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* BIG GREEN + BUTTON */}
      <button onClick={() => setModal('sale')} style={{
        position:'fixed', bottom:80, right:'max(16px, calc(50% - 224px))',
        width:60, height:60, borderRadius:'50%',
        background:'#1D9E75', color:'#fff', border:'none',
        cursor:'pointer', fontSize:28, fontWeight:300,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 4px 16px rgba(29,158,117,0.45)', zIndex:90
      }}>+</button>

      {/* SALE MODAL */}
      {modal === 'sale' && (
        <ModalSheet title="Log a sale" onClose={() => setModal(null)}>
          <form onSubmit={handleSaveSale}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>What did you sell? *</label>
              <input value={sale.name} onChange={e=>setSale(s=>({...s,name:e.target.value}))} placeholder="e.g. Starkle G 70g ×2, Hoya Kit" required
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48 }} />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Sale price (CAD) *</label>
              <div style={{ display:'flex', alignItems:'center', border:'0.5px solid #e5e5e5', borderRadius:9, overflow:'hidden' }}>
                <span style={{ padding:'12px 13px', fontSize:14, fontWeight:500, color:'#999', background:'#f5f5f5', borderRight:'0.5px solid #e5e5e5' }}>CA$</span>
                <input type="number" value={sale.amount} onChange={e=>setSale(s=>({...s,amount:e.target.value}))} placeholder="0.00" step="0.01" min="0" required
                  style={{ flex:1, padding:'12px', border:'none', fontSize:18, fontFamily:'inherit', fontWeight:500, outline:'none', minHeight:48 }} />
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Where sold</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {CHANNELS.map(c => <Opt key={c} label={c} value={c} current={sale.channel} onClick={()=>setSale(s=>({...s,channel:c}))} />)}
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Payment</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {PAYMENTS.map(p => <Opt key={p} label={p} value={p} current={sale.payment} onClick={()=>setSale(s=>({...s,payment:p}))} />)}
              </div>
              {sale.payment==='💵 Cash' && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'#FAEEDA', borderLeft:'3px solid #EF9F27', borderRadius:'0 8px 8px 0', fontSize:12, color:'#633806' }}>
                  Cash sale — will be excluded from CRA export
                </div>
              )}
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Date</label>
              <input type="date" value={sale.date} onChange={e=>setSale(s=>({...s,date:e.target.value}))}
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48 }} />
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Notes (optional)</label>
              <input value={sale.notes} onChange={e=>setSale(s=>({...s,notes:e.target.value}))} placeholder="e.g. repeat customer, bundle deal"
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48 }} />
            </div>

            <button type="submit" disabled={saving} style={{ width:'100%', padding:15, background:saving?'#ccc':'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:500, cursor:saving?'default':'pointer', minHeight:52 }}>
              {saving?'Saving…':'Save sale'}
            </button>
          </form>
        </ModalSheet>
      )}

      {/* EXPENSE MODAL */}
      {modal === 'expense' && (
        <ModalSheet title="Log an expense" onClose={() => setModal(null)}>
          <form onSubmit={handleSaveExpense}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Category</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>
                {EXP_CATS.map(c => (
                  <button key={c} type="button" onClick={()=>setExp(f=>({...f,category:c}))} style={{ padding:'11px 12px', borderRadius:10, border:'0.5px solid #e5e5e5', cursor:'pointer', fontSize:13, fontWeight:500, background:exp.category===c?'#1a1a1a':'#fff', color:exp.category===c?'#fff':'#1a1a1a', minHeight:46 }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Amount (CAD) *</label>
              <div style={{ display:'flex', alignItems:'center', border:'0.5px solid #e5e5e5', borderRadius:9, overflow:'hidden' }}>
                <span style={{ padding:'12px 13px', fontSize:14, fontWeight:500, color:'#999', background:'#f5f5f5', borderRight:'0.5px solid #e5e5e5' }}>CA$</span>
                <input type="number" value={exp.amount} onChange={e=>setExp(f=>({...f,amount:e.target.value}))} placeholder="0.00" step="0.01" min="0" required
                  style={{ flex:1, padding:'12px', border:'none', fontSize:18, fontFamily:'inherit', fontWeight:500, outline:'none', minHeight:48 }} />
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Description (optional)</label>
              <input value={exp.description} onChange={e=>setExp(f=>({...f,description:e.target.value}))} placeholder="e.g. Reptile Show table fee"
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48 }} />
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Date</label>
              <input type="date" value={exp.date} onChange={e=>setExp(f=>({...f,date:e.target.value}))}
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48 }} />
            </div>

            <button type="submit" disabled={saving} style={{ width:'100%', padding:15, background:saving?'#ccc':'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:500, cursor:saving?'default':'pointer', minHeight:52 }}>
              {saving?'Saving…':'Save expense'}
            </button>
          </form>
        </ModalSheet>
      )}

    </div>
  )
}

    
