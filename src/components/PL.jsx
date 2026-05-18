    import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSales, getExpenses } from '../services/sheets.js'
import { TopBar, SectionTitle, FAB } from './Nav.jsx'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CHANNELS = ['Show','Website','Instagram','Facebook','Imports','Other']

export default function PL() {
  const navigate = useNavigate()
  const [sales, setSales]       = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth())
  const GOAL = parseFloat(localStorage.getItem('goal')||'4500')

  useEffect(() => {
    Promise.all([getSales(), getExpenses()])
      .then(([s,e]) => { setSales(s); setExpenses(e); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const year = new Date().getFullYear()
  const ms = sales.filter(s => { const d=new Date(s.Date); return d.getMonth()===activeMonth&&d.getFullYear()===year })
  const me = expenses.filter(e => { const d=new Date(e.Date); return d.getMonth()===activeMonth&&d.getFullYear()===year })
  const revenue  = ms.reduce((s,r)=>s+parseFloat(r['Sale Price (CAD)']||0),0)
  const expTotal = me.reduce((s,r)=>s+parseFloat(r['Amount (CAD)']||0),0)
  const profit   = revenue-expTotal
  const margin   = revenue>0?Math.round((profit/revenue)*100):0
  const goalPct  = Math.min(100,Math.round((revenue/GOAL)*100))
  const cashSales = ms.filter(s=>s.Payment==='💵 Cash').reduce((s,r)=>s+parseFloat(r['Sale Price (CAD)']||0),0)
  const fmt = n => `CA$${Math.round(n).toLocaleString()}`

  const byChannel = CHANNELS.map(c => ({ label:c, amount:ms.filter(s=>s.Channel===c).reduce((s,r)=>s+parseFloat(r['Sale Price (CAD)']||0),0) })).filter(c=>c.amount>0).sort((a,b)=>b.amount-a.amount)
  const maxChan = Math.max(...byChannel.map(c=>c.amount),1)

  return (
    <div style={{ paddingBottom:100 }}>
      <TopBar title="P&L" subtitle={`${MONTHS[activeMonth]} ${year}`} showBack={true} />

      <div style={{ display:'flex', gap:6, padding:'12px 16px', overflowX:'auto', scrollbarWidth:'none', borderBottom:'0.5px solid #f0f0f0' }}>
        {MONTHS.map((m,i) => (
          <button key={m} onClick={()=>setActiveMonth(i)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap', border:'0.5px solid #e5e5e5', background:activeMonth===i?'#1a1a1a':'#fff', color:activeMonth===i?'#fff':'#666', minHeight:36 }}>{m}</button>
        ))}
      </div>

      {loading ? <div style={{ padding:24, textAlign:'center', color:'#999' }}>Loading…</div> : (
        <>
          <div style={{ margin:'14px 16px 0', padding:'10px 14px', background:'#f5f5f5', borderRadius:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'#666' }}>Goal: {fmt(GOAL)}</span>
              <span style={{ fontSize:12, fontWeight:500 }}>{goalPct}%</span>
            </div>
            <div style={{ height:5, background:'#e5e5e5', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${goalPct}%`, background:goalPct>=100?'#1D9E75':goalPct>=60?'#c8824a':'#A32D2D', borderRadius:3 }} />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, padding:14 }}>
            {[
              { label:'Revenue',  value:fmt(revenue),  color:'#1D9E75' },
              { label:'Expenses', value:fmt(expTotal),  color:'#1a1a1a' },
              { label:'Profit',   value:fmt(profit),   color:profit>=0?'#1D9E75':'#A32D2D' },
              { label:'Margin',   value:`${margin}%`,  color:margin>=40?'#1D9E75':margin>=20?'#BA7517':'#A32D2D' },
            ].map(s => (
              <div key={s.label} style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:20, fontWeight:500, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {revenue-GOAL<0 && <div style={{ margin:'0 16px 14px', padding:'10px 13px', background:'#FAEEDA', borderLeft:'3px solid #EF9F27', borderRadius:'0 8px 8px 0', fontSize:13, color:'#633806' }}>{fmt(GOAL-revenue)} short of goal this month</div>}

          {cashSales>0 && <div style={{ margin:'0 16px 14px', padding:'10px 13px', background:'#FAEEDA', borderLeft:'3px solid #EF9F27', borderRadius:'0 8px 8px 0', fontSize:12, color:'#633806' }}>{fmt(cashSales)} cash — excluded from CRA export</div>}

          {byChannel.length>0 && (
            <div style={{ padding:'0 16px', marginBottom:16 }}>
              <SectionTitle style={{ padding:0, marginBottom:10 }}>Revenue by channel</SectionTitle>
              {byChannel.map(c => (
                <div key={c.label} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13 }}>{c.label}</span>
                    <span style={{ fontSize:13, fontWeight:500 }}>{fmt(c.amount)}</span>
                  </div>
                  <div style={{ height:4, background:'#f0f0f0', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.round(c.amount/maxChan*100)}%`, background:'#1D9E75', borderRadius:2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <SectionTitle>Transactions</SectionTitle>
          <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8, paddingBottom:24 }}>
            {ms.length===0&&me.length===0 ? <div style={{ fontSize:14, color:'#999' }}>No transactions this month</div>
            : [...ms.map(s=>({type:'sale',name:s['Plant Name'],meta:`${s.Channel}·${s.Payment||''}`,amount:parseFloat(s['Sale Price (CAD)']||0)})),
               ...me.map(e=>({type:'expense',name:e.Description||e.Category,meta:e.Category,amount:parseFloat(e['Amount (CAD)']||0)}))
              ].map((t,i) => (
              <div key={i} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:10, padding:'12px 13px', display:'flex', alignItems:'center', gap:11 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:t.type==='sale'?'#1D9E75':'#A32D2D' }} />
                <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{t.name}</div><div style={{ fontSize:11, color:'#999', marginTop:2 }}>{t.meta}</div></div>
                <div style={{ fontSize:13, fontWeight:500, color:t.type==='sale'?'#1D9E75':'#A32D2D' }}>{t.type==='sale'?'+':'−'}CA${Math.round(t.amount)}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <FAB onPress={() => navigate('/expenses?add=true')} />
    </div>
  )
}

    
