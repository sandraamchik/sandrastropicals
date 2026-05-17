import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getInventory, addInventory } from '../services/sheets.js'

const STAGES = ['On order','Received','Acclimating','Ready','Propagating','Babies ready','Sold','Dead']
const STAGE_COLORS = {
  'On order':    '#378ADD',
  'Received':    '#c8824a',
  'Acclimating': '#BA7517',
  'Ready':       '#1D9E75',
  'Propagating': '#534AB7',
  'Babies ready':'#0F6E56',
  'Sold':        '#999',
  'Dead':        '#ccc',
}

const TYPES = ['Alocasia','Philodendron','Monstera','Hoya','Anthurium','Other']

export default function Inventory() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [plants, setPlants]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState('pipeline') // pipeline | list
  const [tab, setTab]           = useState('active')   // active | add
  const [search, setSearch]     = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    name:'', type:'Alocasia', qty:1, date: new Date().toISOString().slice(0,10),
    cost:'', currency:'IDR', source:'Okanoka', mother:'No', sellPrice:'', notes:'', status:'Received'
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add' || action === 'buy') setTab('add')
    getInventory().then(data => { setPlants(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const active = plants.filter(p => p.Status !== 'Sold' && p.Status !== 'Dead')
  const filtered = active.filter(p => {
    const qMatch = p['Plant Name']?.toLowerCase().includes(search.toLowerCase()) || p.Type?.toLowerCase().includes(search.toLowerCase())
    const sMatch = filterStage === 'all' || p.Status === filterStage
    return qMatch && sMatch
  })

  const stageCounts = STAGES.slice(0,-2).reduce((acc, s) => {
    acc[s] = active.filter(p => p.Status === s).length
    return acc
  }, {})

  const totalCost = active.reduce((s,p) => s + parseFloat(p['Cost (CAD)']||0), 0)
  const totalVal  = active.reduce((s,p) => s + parseFloat(p['Sell Price (CAD)']||0), 0)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await addInventory([
        form.name, form.type, form.qty, form.date,
        parseFloat(form.cost)||'', parseFloat(form.sellPrice)||'',
        '', form.source, form.mother, form.status, '', form.notes
      ])
      setSaved(true)
      const data = await getInventory()
      setPlants(data)
      setForm(f => ({ ...f, name:'', cost:'', sellPrice:'', notes:'', qty:1 }))
      setTimeout(() => { setSaved(false); setTab('active') }, 1200)
    } catch {
      alert('Failed to save. Check your Google Sheets connection in Settings.')
    } finally {
      setSaving(false)
    }
  }

  function PlantCard({ p }) {
    const age = p['Date Added'] ? Math.floor((new Date() - new Date(p['Date Added']))/86400000) : null
    const isOld = age > 120 && p['Mother Plant'] !== 'Yes'
    const margin = p['Cost (CAD)'] && p['Sell Price (CAD)']
      ? Math.round(((p['Sell Price (CAD)'] - p['Cost (CAD)']) / p['Sell Price (CAD)']) * 100) : null

    return (
      <div onClick={() => setSelected(selected?.['Plant Name'] === p['Plant Name'] ? null : p)}
        style={{ background:'#fff', border:`0.5px solid ${isOld ? '#EF9F27' : '#e5e5e5'}`,
          borderLeft:`3px solid ${STAGE_COLORS[p.Status]||'#e5e5e5'}`,
          borderRadius:'0 10px 10px 0', padding:'12px 13px', cursor:'pointer', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:500 }}>{p['Plant Name']}</div>
            <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#f5f5f5', color:'#666' }}>{p.Type}</span>
              <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background: STAGE_COLORS[p.Status]+'22', color: STAGE_COLORS[p.Status] }}>{p.Status}</span>
              {p['Mother Plant'] === 'Yes' && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#EEEDFE', color:'#534AB7' }}>Mother</span>}
              {p.Qty > 1 && <span style={{ fontSize:11, color:'#999' }}>×{p.Qty}</span>}
              {age !== null && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background: isOld?'#FAEEDA':'#f5f5f5', color: isOld?'#854F0B':'#999' }}>{age}d</span>}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:14, fontWeight:500 }}>{p['Cost (CAD)'] ? `CA$${parseFloat(p['Cost (CAD)']).toFixed(2)}` : <span style={{ color:'#EF9F27', fontSize:12 }}>no cost ⚑</span>}</div>
            {margin !== null && <div style={{ fontSize:11, color:'#1D9E75', marginTop:2 }}>{margin}% margin</div>}
          </div>
        </div>

        {selected?.['Plant Name'] === p['Plant Name'] && (
          <div style={{ marginTop:10, paddingTop:10, borderTop:'0.5px solid #f0f0f0' }}>
            {p.Source && <div style={{ fontSize:12, color:'#999', marginBottom:4 }}>Source: <span style={{ color:'#1a1a1a', fontWeight:500 }}>{p.Source}</span></div>}
            {p.Notes && <div style={{ fontSize:12, color:'#999', marginBottom:8, fontStyle:'italic' }}>{p.Notes}</div>}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {['Mark ready','Log propagation','Log sale','Mark as dead'].map(action => (
                <button key={action} onClick={e => { e.stopPropagation(); alert(`"${action}" coming soon — will update ${p['Plant Name']} in your sheet`) }}
                  style={{ padding:'6px 11px', borderRadius:8, border:'0.5px solid #e5e5e5', background: action==='Mark as dead'?'#fff':'#f5f5f5', fontSize:12, color: action==='Mark as dead'?'#A32D2D':'#1a1a1a', cursor:'pointer' }}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:500 }}>Inventory</div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{active.length} plants · {active.reduce((s,p)=>s+parseInt(p.Qty||1),0)} units</div>
        </div>
        <button onClick={() => setTab(tab==='add'?'active':'add')} style={{
          padding:'7px 14px', borderRadius:20, fontSize:13, fontWeight:500, cursor:'pointer',
          background: tab==='add'?'#1a1a1a':'#f5f5f5', color: tab==='add'?'#fff':'#666', border:'none'
        }}>{tab==='add'?'✕ Cancel':'+ Add'}</button>
      </div>

      {tab === 'active' && (
        <>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, padding:14 }}>
            <div style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
              <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Total cost</div>
              <div style={{ fontSize:20, fontWeight:500 }}>CA${Math.round(totalCost).toLocaleString()}</div>
            </div>
            <div style={{ background:'#f5f5f5', borderRadius:8, padding:12 }}>
              <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Est. value</div>
              <div style={{ fontSize:20, fontWeight:500, color:'#1D9E75' }}>CA${Math.round(totalVal).toLocaleString()}</div>
            </div>
          </div>

          {/* Pipeline counts */}
          <div style={{ padding:'0 16px', marginBottom:14, overflowX:'auto', scrollbarWidth:'none' }}>
            <div style={{ display:'flex', gap:6' }}>
              <button onClick={() => setFilterStage('all')} style={{
                padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
                border:'0.5px solid #e5e5e5', background: filterStage==='all'?'#1a1a1a':'#fff', color: filterStage==='all'?'#fff':'#666'
              }}>All ({active.length})</button>
              {Object.entries(stageCounts).filter(([,n])=>n>0).map(([s,n]) => (
                <button key={s} onClick={() => setFilterStage(s)} style={{
                  padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
                  border:`0.5px solid ${STAGE_COLORS[s]}44`,
                  background: filterStage===s ? STAGE_COLORS[s] : '#fff',
                  color: filterStage===s ? '#fff' : STAGE_COLORS[s]
                }}>{s} ({n})</button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ padding:'0 16px', marginBottom:12 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plants…"
              style={{ width:'100%', padding:'9px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#1a1a1a', background:'#f5f5f5', outline:'none' }} />
          </div>

          {/* Plant list */}
          <div style={{ padding:'0 16px' }}>
            {loading ? <div style={{ fontSize:14, color:'#999' }}>Loading…</div>
            : filtered.length === 0 ? <div style={{ fontSize:14, color:'#999' }}>No plants found</div>
            : filtered.map((p,i) => <PlantCard key={i} p={p} />)}
          </div>
        </>
      )}

      {tab === 'add' && (
        <form onSubmit={handleSave} style={{ padding:'20px 16px' }}>
          {[
            { label:'Plant name *', key:'name', type:'text', placeholder:'e.g. Alocasia Dragon Scale' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e=>setForm(fm=>({...fm,[f.key]:e.target.value}))} placeholder={f.placeholder} required={f.key==='name'}
                style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#1a1a1a', background:'#fff' }} />
            </div>
          ))}

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Type</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {TYPES.map(t => (
                <button key={t} type="button" onClick={() => setForm(f=>({...f,type:t}))} style={{
                  padding:'6px 12px', borderRadius:20, fontSize:13, cursor:'pointer', border:'0.5px solid #e5e5e5',
                  background: form.type===t?'#1a1a1a':'#fff', color: form.type===t?'#fff':'#666'
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Quantity</label>
              <input type="number" min="1" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Date received</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit' }} />
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Cost paid</label>
            <div style={{ display:'flex', gap:8 }}>
              <input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} placeholder="0.00" step="0.01" min="0"
                style={{ flex:1, padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit' }} />
              <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}
                style={{ padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit' }}>
                <option>IDR</option><option>THB</option><option>CAD</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Source</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {['Okanoka','Nattaya Plants','Somchai Exotics','Other'].map(s => (
                <button key={s} type="button" onClick={() => setForm(f=>({...f,source:s}))} style={{
                  padding:'6px 12px', borderRadius:20, fontSize:13, cursor:'pointer', border:'0.5px solid #e5e5e5',
                  background: form.source===s?'#1a1a1a':'#fff', color: form.source===s?'#fff':'#666'
                }}>{s}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Status</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {STAGES.slice(0,-2).map(s => (
                <button key={s} type="button" onClick={() => setForm(f=>({...f,status:s}))} style={{
                  padding:'6px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                  border:`0.5px solid ${STAGE_COLORS[s]}44`,
                  background: form.status===s?STAGE_COLORS[s]:'#fff',
                  color: form.status===s?'#fff':STAGE_COLORS[s]
                }}>{s}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Mother plant?</label>
            <div style={{ display:'flex', gap:8 }}>
              {['Yes','No'].map(v => (
                <button key={v} type="button" onClick={() => setForm(f=>({...f,mother:v}))} style={{
                  padding:'7px 20px', borderRadius:20, fontSize:13, cursor:'pointer', border:'0.5px solid #e5e5e5',
                  background: form.mother===v?'#1a1a1a':'#fff', color: form.mother===v?'#fff':'#666'
                }}>{v}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Sell price (CAD) — optional</label>
            <input type="number" value={form.sellPrice} onChange={e=>setForm(f=>({...f,sellPrice:e.target.value}))} placeholder="0.00" step="0.01" min="0"
              style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit' }} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Notes — optional</label>
            <input type="text" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. consignment, gift cert, mother plant…"
              style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit' }} />
          </div>

          <button type="submit" disabled={saving} style={{
            width:'100%', padding:13, background: saved?'#0F6E56':'#1D9E75',
            color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:500, cursor:'pointer'
          }}>{saved?'✓ Saved!':saving?'Saving…':'Add to inventory'}</button>
        </form>
      )}
    </div>
  )
}
