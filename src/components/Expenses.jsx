import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExpenses, addExpense } from '../services/sheets.js'

const CATS = [
  { key:'show',    label:'Show / event fee',  icon:'🎪' },
  { key:'ship',    label:'Shipping & import', icon:'📦' },
  { key:'supply',  label:'Supplies',          icon:'🧪' },
  { key:'gas',     label:'Gas & travel',      icon:'🚗' },
  { key:'plant',   label:'Plant purchase',    icon:'🌿' },
  { key:'other',   label:'Other',             icon:'📋' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Expenses() {
  const navigate = useNavigate()
  const [tab, setTab]         = useState('list') // list | add
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth())
  const [form, setForm] = useState({
    category:'show', amount:'', description:'', date: new Date().toISOString().slice(0,10), method:'photo'
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    getExpenses().then(data => { setExpenses(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const year = new Date().getFullYear()
  const monthly = expenses.filter(e => {
    const d = new Date(e.Date)
    return d.getMonth() === activeMonth && d.getFullYear() === year
  })
  const total = monthly.reduce((s,e) => s + parseFloat(e['Amount (CAD)']||0), 0)
  const bycat = CATS.map(c => ({
    ...c,
    amount: monthly.filter(e => e.Category?.toLowerCase().includes(c.key) || e.Category === c.label)
                   .reduce((s,e) => s + parseFloat(e['Amount (CAD)']||0), 0)
  })).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount)
  const maxCat = Math.max(...bycat.map(c => c.amount), 1)

  async function handleSave(e) {
    e.preventDefault()
    if (!form.amount) return
    setSaving(true)
    try {
      const cat = CATS.find(c => c.key === form.category)
      await addExpense([form.date, cat?.label || form.category, parseFloat(form.amount), form.description, ''])
      setSaved(true)
      setForm(f => ({ ...f, amount:'', description:'' }))
      const data = await getExpenses()
      setExpenses(data)
      setTimeout(() => { setSaved(false); setTab('list') }, 1200)
    } catch(err) {
      alert('Failed to save. Check your Google Sheets connection in Settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:500 }}>Expenses</div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Business costs</div>
        </div>
        <button onClick={() => setTab(tab === 'add' ? 'list' : 'add')} style={{
          padding:'7px 14px', borderRadius:20, fontSize:13, fontWeight:500, cursor:'pointer',
          background: tab === 'add' ? '#1a1a1a' : '#f5f5f5',
          color: tab === 'add' ? '#fff' : '#666', border:'none'
        }}>{tab === 'add' ? '✕ Cancel' : '+ Add'}</button>
      </div>

      {tab === 'list' && (
        <>
          {/* Month tabs */}
          <div style={{ display:'flex', gap:6, padding:'12px 16px', overflowX:'auto', scrollbarWidth:'none', borderBottom:'0.5px solid #f0f0f0' }}>
            {MONTHS.map((m,i) => (
              <button key={m} onClick={() => setActiveMonth(i)} style={{
                padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
                border:'0.5px solid #e5e5e5',
                background: activeMonth === i ? '#1a1a1a' : '#fff',
                color: activeMonth === i ? '#fff' : '#666'
              }}>{m}</button>
            ))}
          </div>

          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, padding:14 }}>
            <div style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
              <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Total spent</div>
              <div style={{ fontSize:20, fontWeight:500, color: total > 1500 ? '#A32D2D' : '#1a1a1a' }}>CA${Math.round(total).toLocaleString()}</div>
            </div>
            <div style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
              <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Transactions</div>
              <div style={{ fontSize:20, fontWeight:500 }}>{monthly.length}</div>
            </div>
          </div>

          {/* By category */}
          {bycat.length > 0 && (
            <div style={{ padding:'0 16px', marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>By category</div>
              {bycat.map(c => (
                <div key={c.key} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, color:'#1a1a1a' }}>{c.icon} {c.label}</span>
                    <span style={{ fontSize:13, fontWeight:500 }}>CA${Math.round(c.amount)}</span>
                  </div>
                  <div style={{ height:4, background:'#f0f0f0', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.round(c.amount/maxCat*100)}%`, background:'#1a1a1a', borderRadius:2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transaction list */}
          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10 }}>Transactions</div>
          <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8 }}>
            {loading ? <div style={{ fontSize:14, color:'#999' }}>Loading…</div>
            : monthly.length === 0 ? <div style={{ fontSize:14, color:'#999' }}>No expenses this month</div>
            : monthly.map((e,i) => (
              <div key={i} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:10, padding:'11px 13px', display:'flex', alignItems:'center', gap:11 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#A32D2D', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{e.Description || e.Category}</div>
                  <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{e.Date} · {e.Category}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:'#A32D2D' }}>−CA${parseFloat(e['Amount (CAD)']||0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'add' && (
        <form onSubmit={handleSave} style={{ padding:'20px 16px' }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Category</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>
              {CATS.map(c => (
                <button key={c.key} type="button" onClick={() => setForm(f => ({ ...f, category:c.key }))} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
                  borderRadius:10, border:'0.5px solid #e5e5e5', cursor:'pointer',
                  background: form.category === c.key ? '#1a1a1a' : '#fff',
                  color: form.category === c.key ? '#fff' : '#1a1a1a', fontSize:13, fontWeight:500
                }}><span style={{ fontSize:16 }}>{c.icon}</span>{c.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Amount (CAD)</label>
            <div style={{ display:'flex', alignItems:'center', border:'0.5px solid #e5e5e5', borderRadius:8, overflow:'hidden' }}>
              <span style={{ padding:'10px 12px', fontSize:14, fontWeight:500, color:'#999', background:'#f5f5f5', borderRight:'0.5px solid #e5e5e5' }}>CA$</span>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} placeholder="0.00" step="0.01" min="0" required
                style={{ flex:1, padding:'10px 12px', border:'none', fontSize:16, fontFamily:'inherit', fontWeight:500, color:'#1a1a1a', background:'#fff', outline:'none' }} />
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Description (optional)</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} placeholder="e.g. Reptile Show table fee May 13"
              style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#1a1a1a', background:'#fff' }} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))}
              style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#1a1a1a', background:'#fff' }} />
          </div>

          <button type="submit" disabled={saving} style={{
            width:'100%', padding:13, background: saved ? '#0F6E56' : '#1D9E75',
            color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:500, cursor:'pointer', marginTop:4
          }}>{saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save expense'}</button>
        </form>
      )}
    </div>
  )
}
