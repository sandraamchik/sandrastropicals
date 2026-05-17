import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SHOWS = [
  { name:'Reptile & Plant Show', date:'2026-06-01', status:'unpaid', fee:140, rev:1500, location:'Toronto, ON' },
  { name:'Peterborough Plant Show', date:'2026-06-21', status:'confirmed', fee:140, rev:1800, location:'Peterborough, ON' },
  { name:'Toronto Rare Plant Fair', date:'2026-07-12', status:'tentative', fee:140, rev:1200, location:'Toronto, ON' },
]

const PAST = [
  { name:'Reptile & Plant Show', date:'2026-05-13', fee:140, revenue:1500, profit:1080, margin:72 },
  { name:'Peterborough Plant Show', date:'2026-04-06', fee:140, revenue:1813, profit:1323, margin:73 },
  { name:'Reptile & Plant Show', date:'2026-03-01', fee:140, revenue:1296, profit:776, margin:60 },
]

const STATUS_COLOR = { confirmed:'#1D9E75', unpaid:'#EF9F27', tentative:'#999' }
const STATUS_LABEL = { confirmed:'Confirmed · fee paid', unpaid:'Confirmed · fee not paid', tentative:'Tentative' }

export default function Shows() {
  const navigate = useNavigate()
  const [tab, setTab]   = useState('upcoming') // upcoming | past | add
  const [view, setView] = useState('list')     // list | calendar
  const [month, setMonth] = useState(5) // June = index 5
  const [selected, setSelected] = useState(null)

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  function CalendarView() {
    const year = 2026
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month+1, 0).getDate()
    const allShows = [...SHOWS, ...PAST.map(p => ({ ...p, status:'past' }))]

    return (
      <div style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <button onClick={() => setMonth(m => Math.max(0,m-1))} style={{ background:'none', border:'0.5px solid #e5e5e5', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:14, color:'#666' }}>‹</button>
          <div style={{ fontSize:15, fontWeight:500 }}>{MONTH_NAMES[month]} {year}</div>
          <button onClick={() => setMonth(m => Math.min(11,m+1))} style={{ background:'none', border:'0.5px solid #e5e5e5', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:14, color:'#666' }}>›</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:1, marginBottom:4 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ textAlign:'center', fontSize:10, color:'#999', padding:'4px 0', textTransform:'uppercase' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:2 }}>
          {Array(firstDay).fill(null).map((_,i) => <div key={`e${i}`} />)}
          {Array.from({length:daysInMonth},(_,i)=>i+1).map(d => {
            const show = allShows.find(s => new Date(s.date).getDate()===d && new Date(s.date).getMonth()===month)
            const isToday = d===16 && month===4
            return (
              <div key={d} onClick={() => show && setSelected(show)}
                style={{ minHeight:44, borderRadius:6, padding:4, background: show?'#f5f5f5':isToday?'#f0f0f0':'transparent', cursor:show?'pointer':'default', border: isToday?'1.5px solid #1a1a1a':'none' }}>
                <div style={{ fontSize:11, fontWeight:500, color: isToday?'#1a1a1a':'#999' }}>{d}</div>
                {show && <div style={{ fontSize:9, padding:'1px 3px', borderRadius:3, marginTop:2, background: STATUS_COLOR[show.status]||'#ccc', color:'#fff', lineHeight:1.3 }}>{show.name.split(' ')[0]}</div>}
              </div>
            )
          })}
        </div>
        {selected && (
          <div style={{ marginTop:14, background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:8 }}>{selected.name}</div>
            <div style={{ fontSize:12, color:'#999', marginBottom:4 }}>📅 {selected.date} · {selected.location}</div>
            <div style={{ fontSize:12, color:'#999', marginBottom:8 }}>{STATUS_LABEL[selected.status]}</div>
            {selected.status==='unpaid' && (
              <button onClick={() => alert('Mark fee paid — will update your sheet')}
                style={{ padding:'8px 14px', borderRadius:8, background:'#EF9F27', color:'#fff', border:'none', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                Mark fee paid
              </button>
            )}
          </div>
        )}
        <div style={{ display:'flex', gap:12, marginTop:14, flexWrap:'wrap' }}>
          {[{c:'#1D9E75',l:'Confirmed · paid'},{c:'#EF9F27',l:'Fee unpaid'},{c:'#999',l:'Tentative'}].map(i=>(
            <div key={i.l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#666' }}>
              <div style={{ width:10, height:10, borderRadius:2, background:i.c }} />{i.l}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:500 }}>Shows</div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Events & performance</div>
        </div>
        <div style={{ display:'flex', border:'0.5px solid #e5e5e5', borderRadius:8, overflow:'hidden' }}>
          {['list','calendar'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:'5px 12px', fontSize:12, fontWeight:500, cursor:'pointer', border:'none',
              background: view===v?'#1a1a1a':'#fff', color: view===v?'#fff':'#666'
            }}>{v==='list'?'☰ List':'📅 Cal'}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:'0.5px solid #e5e5e5' }}>
        {['upcoming','past'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:10, fontSize:13, cursor:'pointer', border:'none', background:'none',
            borderBottom:`2px solid ${tab===t?'#1D9E75':'transparent'}`,
            color: tab===t?'#1a1a1a':'#999', fontWeight: tab===t?500:400, textTransform:'capitalize'
          }}>{t}</button>
        ))}
      </div>

      {view==='calendar' && <CalendarView />}

      {view==='list' && tab==='upcoming' && (
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {SHOWS.map((s,i) => (
            <div key={i} style={{ background:'#fff', border:`0.5px solid ${STATUS_COLOR[s.status]}44`, borderLeft:`3px solid ${STATUS_COLOR[s.status]}`, borderRadius:'0 12px 12px 0', padding:'13px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{s.name}</div>
                <div style={{ fontSize:11, background:'#f5f5f5', color:'#666', padding:'3px 9px', borderRadius:20, whiteSpace:'nowrap' }}>
                  {new Date(s.date).toLocaleDateString('en-CA',{month:'short',day:'numeric'})}
                </div>
              </div>
              <div style={{ fontSize:12, color:'#999', marginBottom:8 }}>{STATUS_LABEL[s.status]} · {s.location}</div>
              <div style={{ display:'flex', gap:16, marginBottom:10 }}>
                <div><span style={{ fontSize:11, color:'#999' }}>Fee: </span><span style={{ fontSize:12, fontWeight:500, color: s.status==='unpaid'?'#BA7517':'#1a1a1a' }}>CA${s.fee}</span></div>
                <div><span style={{ fontSize:11, color:'#999' }}>Expected: </span><span style={{ fontSize:12, fontWeight:500, color:'#1D9E75' }}>~CA${s.rev.toLocaleString()}</span></div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {s.status==='unpaid' && <button style={{ padding:'7px 12px', borderRadius:8, background:'#EF9F27', color:'#fff', border:'none', fontSize:12, fontWeight:500, cursor:'pointer' }}>Mark fee paid</button>}
                <button style={{ padding:'7px 12px', borderRadius:8, background:'#f5f5f5', color:'#666', border:'none', fontSize:12, cursor:'pointer' }}>Log prep costs</button>
              </div>
            </div>
          ))}
          <button style={{ padding:'11px 14px', border:'0.5px dashed #e5e5e5', borderRadius:10, background:'none', cursor:'pointer', fontSize:14, color:'#999', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16, color:'#ccc' }}>+</span> Add show
          </button>
        </div>
      )}

      {view==='list' && tab==='past' && (
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {PAST.map((s,i) => (
            <div key={i} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:10, padding:'13px 14px', opacity:0.85 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{s.name}</div>
                <div style={{ fontSize:11, color:'#999' }}>{new Date(s.date).toLocaleDateString('en-CA',{month:'short',day:'numeric'})}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:6 }}>
                {[
                  { label:'Revenue', value:`CA$${s.revenue.toLocaleString()}`, color:'#1D9E75' },
                  { label:'Table fee', value:`CA$${s.fee}`, color:'#1a1a1a' },
                  { label:'Net profit', value:`CA$${s.profit.toLocaleString()}`, color:'#1D9E75' },
                  { label:'Margin', value:`${s.margin}%`, color:'#1D9E75' },
                ].map(f => (
                  <div key={f.label} style={{ padding:'8px 10px', background:'#f5f5f5', borderRadius:6 }}>
                    <div style={{ fontSize:10, color:'#999', marginBottom:2 }}>{f.label}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:f.color }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
