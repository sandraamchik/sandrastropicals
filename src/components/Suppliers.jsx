    import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, SectionTitle, AddButton, FAB } from './Nav.jsx'

const SUPPLIERS = [
  { id:'okanoka',   name:'Okanoka (Afif)',  country:'Indonesia', flag:'🇮🇩', type:'Consignment', payMethods:['Wise','E-transfer'], owed:84,  notes:'Consignment — pay after selling' },
  { id:'drhoya',    name:'Dr Hoya',         country:'Indonesia', flag:'🇮🇩', type:'Exact plants', payMethods:['Wise'],             owed:200, notes:'' },
  { id:'mira',      name:'Mira',            country:'Thailand',  flag:'🇹🇭', type:'Exact plants', payMethods:['Wise','Simplii'],   owed:0,   notes:'' },
  { id:'portimol',  name:'Portimol',        country:'Thailand',  flag:'🇹🇭', type:'Exact plants', payMethods:['Wise'],             owed:85,  notes:'' },
  { id:'pkrailuck', name:'PkraiLuck',       country:'Thailand',  flag:'🇹🇭', type:'Exact plants', payMethods:['Wise'],             owed:0,   notes:'' },
  { id:'kunyanee',  name:'Kunyanee',        country:'Thailand',  flag:'🇹🇭', type:'Exact plants', payMethods:['Wise'],             owed:0,   notes:'' },
  { id:'prapai',    name:'Prapai',          country:'Thailand',  flag:'🇹🇭', type:'Exact plants', payMethods:['Wise'],             owed:115, notes:'' },
  { id:'emily',     name:'Emily',           country:'Thailand',  flag:'🇹🇭', type:'Exact plants', payMethods:['Wise'],             owed:320, notes:'' },
  { id:'nunim',     name:'NuNim Nursery',   country:'Thailand',  flag:'🇹🇭', type:'Exact plants', payMethods:['Wise'],             owed:226, notes:'' },
]

const TYPE_COLOR = { 'Consignment':'#1D9E75', 'Exact plants':'#378ADD' }

export default function Suppliers() {
  const navigate  = useNavigate()
  const [selected, setSelected] = useState(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [newSupplier, setNew]   = useState({ name:'', country:'Indonesia', type:'Exact plants', payMethods:'' })

  const totalOwed = SUPPLIERS.reduce((s,sup) => s+sup.owed, 0)

  if (selected) {
    const s = SUPPLIERS.find(x => x.id === selected)
    return (
      <div style={{ paddingBottom:40 }}>
        <TopBar title={s.name} subtitle={`${s.country} · ${s.type}`} showBack={true} />
        <div style={{ padding:'14px 16px' }}>

          <div style={{ background:'#f5f5f5', borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>Balance</div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid #e5e5e5' }}>
              <span style={{ fontSize:13, color:'#666' }}>Outstanding</span>
              <span style={{ fontSize:14, fontWeight:500, color: s.owed>0?'#A32D2D':'#1D9E75' }}>{s.owed>0?`CA$${s.owed} owed`:'All clear ✓'}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid #e5e5e5' }}>
              <span style={{ fontSize:13, color:'#666' }}>Type</span>
              <span style={{ fontSize:13, fontWeight:500, color: TYPE_COLOR[s.type]||'#1a1a1a' }}>{s.type}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0' }}>
              <span style={{ fontSize:13, color:'#666' }}>Payment methods</span>
              <span style={{ fontSize:13, fontWeight:500 }}>{s.payMethods.join(' · ')}</span>
            </div>
          </div>

          {s.notes && <div style={{ background:'#f5f5f5', borderRadius:8, padding:'10px 13px', marginBottom:16, fontSize:13, color:'#666' }}>{s.notes}</div>}

          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            <button onClick={() => alert('Log payment — coming soon')} style={{ flex:1, padding:12, background:'#1D9E75', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer' }}>Log payment</button>
            <button onClick={() => navigate('/import')} style={{ flex:1, padding:12, background:'#f5f5f5', color:'#666', border:'none', borderRadius:10, fontSize:13, cursor:'pointer' }}>Log shipment ↗</button>
          </div>

          <SectionTitle>Recent transactions</SectionTitle>
          <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>No transactions yet — import your data to see history</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom:100 }}>
      <TopBar title="Suppliers" subtitle="Your plant vendors" showBack={true} />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, padding:14 }}>
        <div style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Total owed</div>
          <div style={{ fontSize:20, fontWeight:500, color: totalOwed>0?'#A32D2D':'#1D9E75' }}>CA${totalOwed}</div>
        </div>
        <div style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Suppliers</div>
          <div style={{ fontSize:20, fontWeight:500 }}>{SUPPLIERS.length}</div>
        </div>
      </div>

      <SectionTitle>Consignment</SectionTitle>
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {SUPPLIERS.filter(s=>s.type==='Consignment').map(s => (
          <SupplierCard key={s.id} s={s} onSelect={() => setSelected(s.id)} />
        ))}
      </div>

      <SectionTitle>Exact plants vendors</SectionTitle>
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {SUPPLIERS.filter(s=>s.type==='Exact plants').map(s => (
          <SupplierCard key={s.id} s={s} onSelect={() => setSelected(s.id)} />
        ))}
      </div>

      {showAdd && (
        <div style={{ margin:'0 16px', background:'#f5f5f5', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>New supplier</div>
          {[
            { label:'Name', key:'name', placeholder:'e.g. Green Leaf Bangkok' },
            { label:'Country', key:'country', placeholder:'Indonesia / Thailand / Canada' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:5, display:'block' }}>{f.label}</label>
              <input value={newSupplier[f.key]} onChange={e=>setNew(n=>({...n,[f.key]:e.target.value}))} placeholder={f.placeholder}
                style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit' }} />
            </div>
          ))}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:5, display:'block' }}>Type</label>
            <div style={{ display:'flex', gap:8 }}>
              {['Exact plants','Consignment'].map(t => (
                <button key={t} onClick={()=>setNew(n=>({...n,type:t}))} style={{ padding:'8px 14px', borderRadius:20, fontSize:13, cursor:'pointer', border:'0.5px solid #e5e5e5', background:newSupplier.type===t?'#1a1a1a':'#fff', color:newSupplier.type===t?'#fff':'#666' }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:5, display:'block' }}>Payment methods</label>
            <input value={newSupplier.payMethods} onChange={e=>setNew(n=>({...n,payMethods:e.target.value}))} placeholder="e.g. Wise, Simplii"
              style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit' }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { alert('Supplier saved — will be added to your sheet in a future update'); setShowAdd(false) }}
              style={{ flex:1, padding:12, background:'#1D9E75', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer' }}>Save</button>
            <button onClick={() => setShowAdd(false)}
              style={{ flex:1, padding:12, background:'none', border:'0.5px solid #e5e5e5', borderRadius:10, fontSize:13, color:'#999', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ padding:'0 16px' }}>
        <AddButton label="Add supplier" onClick={() => setShowAdd(true)} />
      </div>

      <FAB onPress={() => setShowAdd(true)} label="+" />
    </div>
  )
}

function SupplierCard({ s, onSelect }) {
  return (
    <div onClick={onSelect} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, padding:'13px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}
      onMouseEnter={e=>e.currentTarget.style.background='#f9f9f9'}
      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
      <div style={{ width:40, height:40, borderRadius:10, background: s.country==='Indonesia'?'#E6F1FB':'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{s.flag}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>{s.name}</div>
        <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{s.country} · {s.payMethods.join(', ')}</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:500, color: s.owed>0?'#A32D2D':'#1D9E75' }}>{s.owed>0?`CA$${s.owed}`:'✓'}</div>
        <div style={{ fontSize:10, color:'#999', marginTop:1 }}>{s.owed>0?'owed':'clear'}</div>
      </div>
    </div>
  )
}

    
