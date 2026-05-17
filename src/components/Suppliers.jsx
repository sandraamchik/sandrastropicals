import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SUPPLIERS = [
  {
    id:'okanoka', name:'Okanoka', country:'Indonesia', city:'Jakarta', flag:'🇮🇩',
    type:'Consignment', billCurrency:'CAD', refCurrency:'IDR',
    payMethods:['Wise','E-transfer'],
    owed:84, owedOrig:960000,
    received:184, receivedOrig:2100000,
    paid:100,
    shipments:[
      { date:'2026-05-12', plants:'Alocasia Dragon Scale ×3', cad:-105, orig:'IDR 1,200,000', rate:'1 CAD = IDR 11,432', type:'shipment' },
      { date:'2026-05-10', plants:'Payment — Wise', cad:100, orig:'≈ IDR 1,143,200', rate:'1 CAD = IDR 11,432', type:'payment', method:'Wise' },
      { date:'2026-05-05', plants:'Philodendron Gloriosum ×1', cad:-79, orig:'IDR 900,000', rate:'1 CAD = IDR 11,432', type:'shipment' },
    ],
    upcoming:'2026-05-31',
  },
  {
    id:'nattaya', name:'Nattaya Plants', country:'Thailand', city:'Bangkok', flag:'🇹🇭',
    type:'Direct buy', billCurrency:'THB', refCurrency:'THB',
    payMethods:['Simplii','Wise'],
    owed:114, owedOrig:2980,
    received:114, receivedOrig:2980,
    paid:0,
    shipments:[
      { date:'2026-05-10', plants:'Hoya Kerrii ×5', cad:-46, orig:'THB 1,200', rate:'1 CAD = THB 26.14', type:'shipment' },
      { date:'2026-05-03', plants:'Hoya Wayetii ×2', cad:-23, orig:'THB 600', rate:'1 CAD = THB 26.14', type:'shipment' },
      { date:'2026-04-25', plants:'Payment — Simplii', cad:120, orig:'THB 3,136', rate:'1 CAD = THB 26.14', type:'payment', method:'Simplii' },
    ],
    upcoming:'2026-06-15',
  },
  {
    id:'somchai', name:'Somchai Exotics', country:'Thailand', city:'Chiang Mai', flag:'🇹🇭',
    type:'Direct buy', billCurrency:'THB', refCurrency:'THB',
    payMethods:['Simplii','Wise'],
    owed:0, owedOrig:0,
    received:46, receivedOrig:1200,
    paid:120,
    shipments:[
      { date:'2026-04-28', plants:'Hoya Kerrii ×2', cad:-46, orig:'THB 1,200', rate:'1 CAD = THB 26.14', type:'shipment' },
      { date:'2026-04-25', plants:'Payment — Simplii', cad:120, orig:'THB 3,136', rate:'1 CAD = THB 26.14', type:'payment', method:'Simplii' },
    ],
    upcoming:null,
  },
]

export default function Suppliers() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [activePayMethod, setActivePayMethod] = useState({})

  const totalOwed = SUPPLIERS.reduce((s,sup) => s + sup.owed, 0)

  if (selected) {
    const s = SUPPLIERS.find(x => x.id === selected)
    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5' }}>
          <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#999', padding:0 }}>‹</button>
          <div>
            <div style={{ fontSize:18, fontWeight:500 }}>{s.name}</div>
            <div style={{ fontSize:12, color:'#999', marginTop:1 }}>{s.country} · {s.type}</div>
          </div>
        </div>

        <div style={{ padding:'14px 16px' }}>
          {/* Balance card */}
          <div style={{ background:'#f5f5f5', borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>Running balance</div>
            {[
              { label:'Received this month', main:`CA$${s.received}`, sub:`${s.refCurrency} ${s.receivedOrig.toLocaleString()}` },
              { label:'Paid this month', main:`CA$${s.paid}`, color: s.paid>0?'#1D9E75':'#1a1a1a' },
              { label:'Outstanding (CAD)', main:`CA$${s.owed}`, color: s.owed>0?'#A32D2D':'#1D9E75' },
              { label:`Outstanding (${s.refCurrency})`, main:`${s.refCurrency} ${s.owedOrig.toLocaleString()}`, color: s.owed>0?'#A32D2D':'#1D9E75', sub:'at today\'s rate' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'7px 0', borderBottom:'0.5px solid #e5e5e5' }}>
                <span style={{ fontSize:13, color:'#666' }}>{r.label}</span>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:r.color||'#1a1a1a' }}>{r.main}</div>
                  {r.sub && <div style={{ fontSize:10, color:'#999', marginTop:1 }}>{r.sub}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Payment method */}
          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Payment method</div>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {s.payMethods.map(m => (
              <button key={m} onClick={() => setActivePayMethod(p => ({ ...p, [s.id]:m }))}
                style={{ padding:'6px 14px', borderRadius:20, fontSize:13, cursor:'pointer',
                  border:'0.5px solid #e5e5e5',
                  background: (activePayMethod[s.id]||s.payMethods[0])===m?'#1a1a1a':'#fff',
                  color: (activePayMethod[s.id]||s.payMethods[0])===m?'#fff':'#666' }}>{m}</button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            <button onClick={() => alert('Log payment form coming — will save to your Suppliers sheet tab')}
              style={{ flex:1, padding:11, background:'#1D9E75', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer' }}>Log payment</button>
            <button onClick={() => alert('Log shipment form coming — will save to your Shipments sheet tab')}
              style={{ flex:1, padding:11, background:'#f5f5f5', color:'#666', border:'none', borderRadius:10, fontSize:13, cursor:'pointer' }}>Log shipment</button>
          </div>

          {/* Upcoming shipment */}
          {s.upcoming && (
            <div style={{ background:'#E6F1FB', border:'0.5px solid #378ADD44', borderLeft:'3px solid #378ADD', borderRadius:'0 10px 10px 0', padding:'10px 13px', marginBottom:16, fontSize:13, color:'#185FA5' }}>
              📦 Expected shipment: {new Date(s.upcoming).toLocaleDateString('en-CA',{month:'long',day:'numeric',year:'numeric'})}
            </div>
          )}

          {/* Transaction history */}
          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Transaction history</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {s.shipments.map((tx,i) => (
              <div key={i} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:10, padding:'12px 13px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: tx.type==='payment'?'#1D9E75':'#378ADD', flexShrink:0 }} />
                  <div style={{ fontSize:13, fontWeight:500, flex:1 }}>{tx.plants}</div>
                  <div style={{ fontSize:13, fontWeight:500, color: tx.cad>0?'#1D9E75':'#A32D2D' }}>
                    {tx.cad>0?'+':''}CA${Math.abs(tx.cad)}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:4, paddingLeft:18 }}>
                  <div style={{ fontSize:11, color:'#999' }}>Date: <span style={{ color:'#1a1a1a', fontWeight:500 }}>{tx.date}</span></div>
                  <div style={{ fontSize:11, color:'#999' }}>{s.refCurrency}: <span style={{ color:'#1a1a1a', fontWeight:500 }}>{tx.orig.replace('IDR ','').replace('THB ','').replace('≈ IDR ','').replace('≈ THB ','')}</span></div>
                  <div style={{ fontSize:11, color:'#999' }}>Rate: <span style={{ color:'#1a1a1a', fontWeight:500 }}>{tx.rate}</span></div>
                  {tx.method && <div style={{ fontSize:11, color:'#999' }}>Via: <span style={{ color:'#1a1a1a', fontWeight:500 }}>{tx.method}</span></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5' }}>
        <div style={{ fontSize:18, fontWeight:500 }}>Suppliers</div>
        <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Shipments & balances</div>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, padding:14 }}>
        <div style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Total owed</div>
          <div style={{ fontSize:20, fontWeight:500, color: totalOwed>0?'#A32D2D':'#1D9E75' }}>CA${totalOwed}</div>
        </div>
        <div style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Incoming shipments</div>
          <div style={{ fontSize:20, fontWeight:500, color:'#BA7517' }}>{SUPPLIERS.filter(s=>s.upcoming).length}</div>
        </div>
      </div>

      {/* Upcoming shipments */}
      <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10 }}>Upcoming shipments</div>
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {SUPPLIERS.filter(s=>s.upcoming).map(s => (
          <div key={s.id} onClick={() => setSelected(s.id)} style={{ background:'#fff', border:'0.5px solid #378ADD44', borderLeft:'3px solid #378ADD', borderRadius:'0 10px 10px 0', padding:'12px 13px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
            <div style={{ textAlign:'center', width:42, flexShrink:0 }}>
              <div style={{ fontSize:18, fontWeight:500, lineHeight:1 }}>{new Date(s.upcoming).getDate()}</div>
              <div style={{ fontSize:10, color:'#999', textTransform:'uppercase' }}>{new Date(s.upcoming).toLocaleString('en',{month:'short'})}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{s.name}</div>
              <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{s.country} · paying via {s.payMethods[0]}</div>
            </div>
            <div style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:'#E6F1FB', color:'#185FA5' }}>Expected</div>
          </div>
        ))}
      </div>

      {/* Supplier list */}
      <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 16px', marginBottom:10 }}>Suppliers</div>
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {SUPPLIERS.map(s => (
          <div key={s.id} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:14, borderBottom:'0.5px solid #f0f0f0' }}>
              <div style={{ width:40, height:40, borderRadius:10, background: s.country==='Indonesia'?'#E6F1FB':'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{s.flag}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:500 }}>{s.name}</div>
                <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{s.country} · {s.city}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:15, fontWeight:500, color: s.owed>0?'#A32D2D':'#1D9E75' }}>CA${s.owed}</div>
                <div style={{ fontSize:10, color:'#999', marginTop:1 }}>{s.owed>0?'you owe':'all clear'}</div>
              </div>
            </div>
            <div style={{ padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'#999' }}>Bills in</span>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:500 }}>{s.billCurrency}</div>
                  {s.billCurrency !== s.refCurrency && <div style={{ fontSize:10, color:'#999' }}>{s.refCurrency} reference shown</div>}
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'#999' }}>Payment methods</span>
                <span style={{ fontSize:12, fontWeight:500 }}>{s.payMethods.join(' · ')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:12, color:'#999' }}>This month received</span>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:500 }}>CA${s.received}</div>
                  <div style={{ fontSize:10, color:'#999' }}>{s.refCurrency} {s.receivedOrig.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => alert('Log payment form coming soon')} style={{ flex:1, padding:'8px', borderRadius:8, border:'0.5px solid #e5e5e5', background:'#fff', fontSize:12, color:'#666', cursor:'pointer' }}>Log payment</button>
                <button onClick={() => alert('Log shipment form coming soon')} style={{ flex:1, padding:'8px', borderRadius:8, border:'0.5px solid #e5e5e5', background:'#fff', fontSize:12, color:'#666', cursor:'pointer' }}>Log shipment</button>
                <button onClick={() => setSelected(s.id)} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:'#1D9E75', fontSize:12, color:'#fff', cursor:'pointer', fontWeight:500 }}>Details →</button>
              </div>
            </div>
          </div>
        ))}
        <button style={{ padding:'11px 14px', border:'0.5px dashed #e5e5e5', borderRadius:10, background:'none', cursor:'pointer', fontSize:14, color:'#999', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16, color:'#ccc' }}>+</span> Add supplier
        </button>
      </div>
    </div>
  )
}
