    import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSales, getExpenses, getPL, addSale, addExpense, upsertCustomer } from '../services/sheets.js'
import SGSaleModal from './SGSaleModal.jsx'

const GOAL = parseFloat(localStorage.getItem('goal') || '4500')
const CHANNELS = ['Show','Website','Instagram','Facebook','Exact plant','Other']
const PAYMENTS = ['💵 Cash','💳 Card','📲 E-transfer','🛍 Shopify']
const EXP_CATS = ['Show / event fee','Shipping & import','Clearance broker','Supplies','Gas & travel','Other']

// Known customers from sheet — in real app this comes from Customers tab
const KNOWN_CUSTOMERS = [
  'Silvana','Maddie','Alexandra','Ashley','Chastity','Aron','Sandra (me)'
]

function ModalSheet({ title, onClose, children }) {
  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'#fff', borderRadius:'16px 16px 0 0', padding:'0 0 32px', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff', zIndex:10 }}>
          <div style={{ fontSize:17, fontWeight:500 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#999', padding:4 }}>✕</button>
        </div>
        <div style={{ padding:'16px' }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:12, color:'#999', marginBottom:7, display:'block' }}>{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type='text', required=false, min, step }) {
  const ref = useRef()
  return (
    <input
      ref={ref}
      type={type}
      defaultValue={value}
      onBlur={e => onChange(e.target.value)}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      step={step}
      style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }}
    />
  )
}

function AmountInput({ value, onChange, placeholder='0.00' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', border:'0.5px solid #e5e5e5', borderRadius:9, overflow:'hidden' }}>
      <span style={{ padding:'12px 13px', fontSize:14, fontWeight:500, color:'#999', background:'#f5f5f5', borderRight:'0.5px solid #e5e5e5', flexShrink:0 }}>CA$</span>
      <input
        type="number"
        defaultValue={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        step="0.01"
        min="0"
        required
        style={{ flex:1, padding:'12px', border:'none', fontSize:18, fontFamily:'inherit', fontWeight:500, outline:'none', minHeight:48 }}
      />
    </div>
  )
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {options.map(o => (
        <button
          key={o} type="button"
          onClick={() => onChange(o)}
          style={{ padding:'8px 14px', borderRadius:20, fontSize:13, cursor:'pointer', border:'0.5px solid #e5e5e5', background:value===o?'#1a1a1a':'#fff', color:value===o?'#fff':'#666', minHeight:36 }}
        >{o}</button>
      ))}
    </div>
  )
}

function CustomerInput({ value, onChange, note, onNoteChange }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const filtered = KNOWN_CUSTOMERS.filter(c => c.toLowerCase().includes(value.toLowerCase()) && value.length > 0)

  return (
    <div style={{ position:'relative' }}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setShowSuggestions(true) }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="Customer name (optional)"
        style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }}
      />
      {showSuggestions && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:9, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:100, overflow:'hidden' }}>
          {filtered.map(c => (
            <div key={c} onMouseDown={() => { onChange(c); setShowSuggestions(false) }}
              style={{ padding:'11px 13px', fontSize:14, cursor:'pointer', borderBottom:'0.5px solid #f5f5f5' }}
              onMouseEnter={e => e.currentTarget.style.background='#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}
            >{c}</div>
          ))}
        </div>
      )}
      {value && (
        <div style={{ marginTop:8 }}>
          <input
            type="text"
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Note about this customer (optional)"
            style={{ width:'100%', padding:'10px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', minHeight:44, boxSizing:'border-box', color:'#666' }}
          />
        </div>
      )}
    </div>
  )
}

export default function Home({ onSignOut }) {
  const navigate = useNavigate()
  const [stats, setStats]     = useState({ revenue:0, expenses:0, margin:0 })
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [showSG, setShowSG]   = useState(false)
  const [saving, setSaving]   = useState(false)

  // Sale state — using refs to avoid re-render on each keystroke
  const saleRef = useRef({ name:'', amount:'', channel:'Show', payment:'💵 Cash', customer:'', customerNote:'', shipping:'', notes:'', date:new Date().toISOString().slice(0,10) })
  const [saleChannel, setSaleChannel]   = useState('Show')
  const [salePayment, setSalePayment]   = useState('💵 Cash')
  const [saleCustomer, setSaleCustomer] = useState('')
  const [saleCustomerNote, setSaleCustomerNote] = useState('')

  // Expense state
  const expRef = useRef({ category:'Show / event fee', amount:'', description:'', date:new Date().toISOString().slice(0,10) })
  const [expCat, setExpCat] = useState('Show / event fee')

  useEffect(() => {
    async function load() {
      try {
        const [sales, expenses, pl] = await Promise.all([getSales(), getExpenses(), getPL()])
        const now = new Date()
        const m = now.getMonth(), y = now.getFullYear()
        const ms = sales.filter(s => { const d=new Date(s.Date); return d.getMonth()===m&&d.getFullYear()===y })
        const me = expenses.filter(e => { const d=new Date(e.Date)||new Date(); return d.getMonth()===m&&d.getFullYear()===y })
        const revenue  = ms.reduce((s,r)=>s+parseFloat(r['Sale Price (CAD)']||0),0)
        const expTotal = me.reduce((s,r)=>s+parseFloat(r['Amount (CAD)']||0),0)
        const profit   = revenue-expTotal
        const margin   = revenue>0?Math.round((profit/revenue)*100):0
        const budget   = Math.max(0,Math.round(profit*0.2))

        // Try to get revenue from P&L Summary for current month
        // P&L Summary months: Dec2025=row0, Jan2026=row1... find matching month label
        const monthLabel = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} ${y}`
        const plRow = pl.find(r => r['Month'] === monthLabel)
        const plRevenue = plRow ? parseFloat(plRow['Total Revenue']||0) : revenue

        setStats({ revenue: plRevenue||revenue, expenses:expTotal, margin, budget })
        setFlags(ms.filter(s => !s['Sale Price (CAD)']))
        setRecent([
          ...ms.slice(-3).map(s=>({type:'sale',name:s['Plant Name']||'Sale',meta:`${s.Channel||''}${s.Payment?' · '+s.Payment:''}`,amount:parseFloat(s['Sale Price (CAD)']||0)})),
          ...me.slice(-2).map(e=>({type:'expense',name:e.Description||e.Category,meta:e.Category,amount:parseFloat(e['Amount (CAD)']||0)}))
        ].slice(-5))
      } catch(err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [sales, expenses, pl] = await Promise.all([getSales(), getExpenses(), getPL()])
      const now = new Date()
      const m = now.getMonth(), y = now.getFullYear()
      const ms = sales.filter(s => { const d=new Date(s.Date); return d.getMonth()===m&&d.getFullYear()===y })
      const me = expenses.filter(e => { const d=new Date(e.Date); return d.getMonth()===m&&d.getFullYear()===y })
      const revenue  = ms.reduce((s,r)=>s+parseFloat(r['Sale Price (CAD)']||0),0)
      const expTotal = me.reduce((s,r)=>s+parseFloat(r['Amount (CAD)']||0),0)
      const profit   = revenue-expTotal
      const monthLabel = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} ${y}`
      const plRow = pl.find(r => r['Month'] === monthLabel)
      const plRevenue = plRow ? parseFloat(plRow['Total Revenue']||0) : revenue
      setStats({ revenue:plRevenue||revenue, expenses:expTotal, margin:revenue>0?Math.round((profit/revenue)*100):0, budget:Math.max(0,Math.round(profit*0.2)) })
      setRecent([
        ...ms.slice(-3).map(s=>({ type:'sale', name:s['Plant Name']||'Sale', meta:`${s.Channel||''}${s.Payment?' · '+s.Payment:''}`, amount:parseFloat(s['Sale Price (CAD)']||0) })),
        ...me.slice(-2).map(e=>({ type:'expense', name:e.Description||e.Category, meta:e.Category, amount:parseFloat(e['Amount (CAD)']||0) }))
      ].slice(-5))
    } catch(err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleSaveSale(e) {
    e.preventDefault()
    const d = saleRef.current
    if (!d.name || !d.amount) return
    setSaving(true)
    try {
      // Sales: Date|Plant Name|Customer|Vendor|Qty|Sale Price|Cost|Margin$|Margin%|Channel|Show Name|Payment|Cash|Shipment ID|Notes
      const notes = [d.notes, saleCustomerNote].filter(Boolean).join(' · ')
      await addSale([
        d.date, d.name, saleCustomer, '', 1, parseFloat(d.amount),
        '', '', '', saleChannel, '',
        salePayment, salePayment==='💵 Cash'?'Yes':'No', '', '', notes
      ])
      // Auto-save customer
      if (saleRef.current.customer) {
        upsertCustomer({
          name:     saleRef.current.customer,
          date:     saleRef.current.date,
          plant:    saleRef.current.name,
          amount:   saleRef.current.amount,
          channel:  saleChannel,
          note:     saleCustomerNote,
          shipping: saleRef.current.shipping,
        })
      }
      setModal(null)
      saleRef.current = { name:'', amount:'', channel:'Show', payment:'💵 Cash', customer:'', customerNote:'', shipping:'', notes:'', date:new Date().toISOString().slice(0,10) }
      setSaleChannel('Show'); setSalePayment('💵 Cash'); setSaleCustomer(''); setSaleCustomerNote('')
      setTimeout(loadData, 500)
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function handleSaveExpense(e) {
    e.preventDefault()
    const d = expRef.current
    if (!d.amount) return
    setSaving(true)
    try {
      await addExpense([d.date, expCat, parseFloat(d.amount), d.description, '', ''])
      setModal(null)
      expRef.current = { category:'Show / event fee', amount:'', description:'', date:new Date().toISOString().slice(0,10) }
      setExpCat('Show / event fee')
      setTimeout(loadData, 500)
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const goalPct = Math.min(100, Math.round((stats.revenue/GOAL)*100))

  return (
    <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', paddingBottom:160 }}>

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
            <div style={{ fontSize:22, fontWeight:500, color:loading?'#ccc':s.color }}>{loading?'—':s.value}</div>
          </div>
        ))}
      </div>

      {/* QUICK ADD */}
      <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10 }}>Quick add</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, padding:'0 16px', marginBottom:20 }}>
        {[
          { label:'Log a sale',  icon:'💸', action:() => setModal('sale'),    color:'#fff', bg:'#1a1a1a' },
          { label:'Log SG sale', icon:'🪴', action:() => setShowSG(true),    color:'#fff', bg:'#C2185B' },
          { label:'Photo log',   icon:'📷', action:() => navigate('/photolog'), color:'#1a1a1a', bg:'#fff' },
          { label:'Log expense', icon:'🧾', action:() => setModal('expense'), color:'#1a1a1a', bg:'#fff' },
          { label:'Import data', icon:'📥', action:() => navigate('/import'), color:'#1a1a1a', bg:'#fff' },
          { label:'Suppliers',   icon:'🌏', action:() => navigate('/suppliers'), color:'#1a1a1a', bg:'#fff' },
        ].map(q => (
          <button key={q.label} onClick={q.action} style={{ display:'flex', alignItems:'center', gap:10, padding:'14px', background:q.bg||'#fff', border:`0.5px solid ${q.bg&&q.bg!=='#fff'?q.bg:'#e5e5e5'}`, borderRadius:12, cursor:'pointer', fontSize:14, fontWeight:500, color:q.color||'#1a1a1a', minHeight:52 }}>
            <span style={{ fontSize:20 }}>{q.icon}</span>{q.label}
          </button>
        ))}
      </div>

      {/* RECENT */}
      <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10 }}>Recent</div>
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {loading
          ? <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>Loading…</div>
          : recent.length===0
          ? <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>No entries yet this month — tap Log a sale to start</div>
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
          ))
        }
      </div>

      {/* BIG GREEN + */}
      <button onClick={() => setModal('sale')} style={{
        position:'fixed', bottom:82, right:'max(16px, calc(50% - 224px))',
        width:62, height:62, borderRadius:'50%',
        background:'#1D9E75', color:'#fff', border:'none', cursor:'pointer',
        fontSize:30, fontWeight:300, display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 4px 18px rgba(29,158,117,0.45)', zIndex:90
      }}>+</button>

      {showSG && <SGSaleModal onClose={() => setShowSG(false)} onSaved={loadData} />}

      {/* SALE MODAL */}
      {modal === 'sale' && (
        <ModalSheet title="Log a sale" onClose={() => setModal(null)}>
          <form onSubmit={handleSaveSale}>
            <Field label="What did you sell? *">
              <input
                type="text"
                placeholder="e.g. Starkle G 70g ×2, Hoya Kit"
                required
                onChange={e => saleRef.current.name = e.target.value}
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }}
              />
            </Field>

            <Field label="Sale price (CAD) *">
              <div style={{ display:'flex', alignItems:'center', border:'0.5px solid #e5e5e5', borderRadius:9, overflow:'hidden' }}>
                <span style={{ padding:'12px 13px', fontSize:14, fontWeight:500, color:'#999', background:'#f5f5f5', borderRight:'0.5px solid #e5e5e5', flexShrink:0 }}>CA$</span>
                <input type="number" onChange={e => saleRef.current.amount = e.target.value} placeholder="0.00" step="0.01" min="0" required
                  style={{ flex:1, padding:'12px', border:'none', fontSize:18, fontFamily:'inherit', fontWeight:500, outline:'none', minHeight:48 }} />
              </div>
            </Field>

            <Field label="Where sold">
              <PillGroup options={CHANNELS} value={saleChannel} onChange={v => { setSaleChannel(v); saleRef.current.channel = v }} />
            </Field>

            <Field label="Payment">
              <PillGroup options={PAYMENTS} value={salePayment} onChange={v => { setSalePayment(v); saleRef.current.payment = v }} />
              {salePayment === '💵 Cash' && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'#FAEEDA', borderLeft:'3px solid #EF9F27', borderRadius:'0 8px 8px 0', fontSize:12, color:'#633806' }}>
                  Cash sale — excluded from CRA export
                </div>
              )}
            </Field>

            <Field label="Customer (optional)">
              <CustomerInput
                value={saleCustomer}
                onChange={v => { setSaleCustomer(v); saleRef.current.customer = v }}
                note={saleCustomerNote}
                onNoteChange={v => { setSaleCustomerNote(v); saleRef.current.customerNote = v }}
              />
              {saleCustomer && (
                <div style={{ marginTop:8 }}>
                  <input type="text" onChange={e => saleRef.current.shipping = e.target.value}
                    placeholder="Shipping address (optional)"
                    style={{ width:'100%', padding:'10px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', minHeight:44, boxSizing:'border-box', color:'#666' }} />
                </div>
              )}
            </Field>

            <Field label="Date">
              <input type="date" defaultValue={saleRef.current.date} onChange={e => saleRef.current.date = e.target.value}
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
            </Field>

            <Field label="Notes (optional)">
              <input type="text" onChange={e => saleRef.current.notes = e.target.value} placeholder="e.g. bundle deal, repeat customer"
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
            </Field>

            <button type="submit" disabled={saving} style={{ width:'100%', padding:15, background:saving?'#ccc':'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:500, cursor:saving?'default':'pointer', minHeight:52 }}>
              {saving ? 'Saving…' : 'Save sale'}
            </button>
          </form>
        </ModalSheet>
      )}

      {/* EXPENSE MODAL */}
      {modal === 'expense' && (
        <ModalSheet title="Log an expense" onClose={() => setModal(null)}>
          <form onSubmit={handleSaveExpense}>
            <Field label="Category">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>
                {EXP_CATS.map(c => (
                  <button key={c} type="button" onClick={() => { setExpCat(c); expRef.current.category = c }}
                    style={{ padding:'11px 12px', borderRadius:10, border:'0.5px solid #e5e5e5', cursor:'pointer', fontSize:13, fontWeight:500, background:expCat===c?'#1a1a1a':'#fff', color:expCat===c?'#fff':'#1a1a1a', minHeight:46 }}>{c}</button>
                ))}
              </div>
            </Field>

            <Field label="Amount (CAD) *">
              <div style={{ display:'flex', alignItems:'center', border:'0.5px solid #e5e5e5', borderRadius:9, overflow:'hidden' }}>
                <span style={{ padding:'12px 13px', fontSize:14, fontWeight:500, color:'#999', background:'#f5f5f5', borderRight:'0.5px solid #e5e5e5', flexShrink:0 }}>CA$</span>
                <input type="number" onChange={e => expRef.current.amount = e.target.value} placeholder="0.00" step="0.01" min="0" required
                  style={{ flex:1, padding:'12px', border:'none', fontSize:18, fontFamily:'inherit', fontWeight:500, outline:'none', minHeight:48 }} />
              </div>
            </Field>

            <Field label="Description (optional)">
              <input type="text" onChange={e => expRef.current.description = e.target.value} placeholder="e.g. Reptile Show table fee"
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
            </Field>

            <Field label="Date">
              <input type="date" defaultValue={expRef.current.date} onChange={e => expRef.current.date = e.target.value}
                style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
            </Field>

            <button type="submit" disabled={saving} style={{ width:'100%', padding:15, background:saving?'#ccc':'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:500, cursor:saving?'default':'pointer', minHeight:52 }}>
              {saving ? 'Saving…' : 'Save expense'}
            </button>
          </form>
        </ModalSheet>
      )}

    </div>
  )
}

    
