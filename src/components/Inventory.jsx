    import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getInventory, addInventory } from '../services/sheets.js'

const STAGES = ['On order','Received','Acclimating','Ready','Propagating','Babies ready','Sold','Dead']
const STAGE_COLORS = {
  'On order':     '#378ADD',
  'Received':     '#c8824a',
  'Acclimating':  '#BA7517',
  'Ready':        '#1D9E75',
  'Propagating':  '#534AB7',
  'Babies ready': '#0F6E56',
  'Sold':         '#999',
  'Dead':         '#ccc',
}
const SOURCES = ['Okanoka','Dr Hoya','Mira','Portimol','PkraiLuck','Kunyanee','Prapai','Emily','NuNim Nursery','Propagated','Local','Other']
const TYPES   = ['Alocasia','Philodendron','Monstera','Hoya','Anthurium','Scindapsus','Rhaphidophora','Other']

export default function Inventory() {
  const navigate     = useNavigate()
  const [searchParams] = useSearchParams()
  const [plants, setPlants]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null) // null | 'add' | 'propagate' | 'update'
  const [search, setSearch]       = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')

  // Add form — use ref to avoid cursor jump on re-render
  const formRef = useRef({
    name: '', type: 'Alocasia', qty: 1,
    dateAdded: new Date().toISOString().slice(0,10),
    cost: '', sellPrice: '', source: 'Okanoka',
    motherPlant: 'No', status: 'Received', notes: '',
  })
  // Only these trigger re-render (pill selections, not text inputs)
  const [formType, setFormType]         = useState('')  // empty = no type selected
  const [formSource, setFormSource]     = useState('Okanoka')
  const [formStatus, setFormStatus]     = useState('Received')
  const [formMother, setFormMother]     = useState('No')

  // Propagate form state
  const [propForm, setPropForm] = useState({
    motherName: '', cuttings: 1, dateAdded: new Date().toISOString().slice(0,10),
  })

  useEffect(() => {
    if (searchParams.get('action') === 'add') setModal('add')
    loadPlants()
  }, [])

  async function loadPlants() {
    setLoading(true)
    try {
      const data = await getInventory()
      setPlants(data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleAddPlant(e) {
    e.preventDefault()
    const f = formRef.current
    if (!f.name) return
    setSaving(true); setError('')
    try {
      await addInventory([
        f.name, formType, f.qty, f.dateAdded,
        f.cost || '', f.sellPrice || '',
        '', formSource, '', formMother, '',
        formStatus, f.dateAdded, '', '', 'No', f.notes,
      ])
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setModal(null)
        formRef.current = { name:'', type:'', qty:1, dateAdded:new Date().toISOString().slice(0,10), cost:'', sellPrice:'', source:'Okanoka', motherPlant:'No', status:'Received', notes:'' }
        setFormType(''); setFormSource('Okanoka'); setFormStatus('Received'); setFormMother('No')
        loadPlants()
      }, 1000)
    } catch(err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  async function handlePropagate(e) {
    e.preventDefault()
    if (!propForm.motherName || !propForm.cuttings) return
    setSaving(true); setError('')
    try {
      // Find mother plant to get cost
      const mother = plants.find(p => p['Plant Name']?.toLowerCase().includes(propForm.motherName.toLowerCase()))
      const motherCost  = mother ? parseFloat(mother['Cost (CAD)'] || 0) : 0
      const costPerBaby = motherCost > 0 ? (motherCost / propForm.cuttings).toFixed(2) : ''

      for (let i = 0; i < propForm.cuttings; i++) {
        await addInventory([
          `${propForm.motherName} — cutting`,
          mother?.Type || '',
          1,
          propForm.dateAdded,
          costPerBaby,
          '', '', // sell price, margin
          mother?.Source || 'Propagated',
          '',
          'No',
          '',
          'Acclimating',
          propForm.dateAdded,
          '', '', 'No',
          `Propagated from ${propForm.motherName}`,
        ])
        if (i < propForm.cuttings - 1) await new Promise(r => setTimeout(r, 1100))
      }
      setSaved(true)
      setTimeout(() => {
        setSaved(false); setModal(null)
        setPropForm({ motherName:'', cuttings:1, dateAdded:new Date().toISOString().slice(0,10) })
        loadPlants()
      }, 1000)
    } catch(err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const active   = plants.filter(p => p.Status !== 'Sold' && p.Status !== 'Dead' && p['Plant Name'])
  const filtered = active.filter(p => {
    const q = p['Plant Name']?.toLowerCase().includes(search.toLowerCase())
    const s = filterStage === 'all' || p.Status === filterStage
    return q && s
  })
  const stageCounts = STAGES.slice(0,-2).reduce((acc,s) => {
    acc[s] = active.filter(p => p.Status === s).length
    return acc
  }, {})
  const totalCost = active.reduce((s,p) => s + (parseFloat(p['Cost (CAD)'])||0), 0)
  const totalVal  = active.reduce((s,p) => s + (parseFloat(p['Sell Price (CAD)'])||0), 0)

  function setPF(k,v) { setPropForm(f => ({...f, [k]:v})) }

  function Pill({ label, active, onClick, color }) {
    return (
      <button type="button" onClick={onClick} style={{ padding:'6px 13px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap', border:`0.5px solid ${active?(color||'#1a1a1a'):'#e5e5e5'}`, background:active?(color||'#1a1a1a'):'#fff', color:active?'#fff':(color||'#666'), minHeight:34 }}>
        {label}
      </button>
    )
  }

  function FieldInput({ label, children }) {
    return (
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, color:'#999', marginBottom:7, display:'block' }}>{label}</label>
        {children}
      </div>
    )
  }

  function inp(refKey, placeholder='', type='text') {
    return (
      <input type={type}
        defaultValue={formRef.current[refKey]}
        onChange={e => { formRef.current[refKey] = e.target.value }}
        placeholder={placeholder}
        style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
    )
  }

  return (
    <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', paddingBottom:100 }}>

      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff', zIndex:50 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:500 }}>Inventory</div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{active.length} plants</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { setModal('propagate'); setError('') }} style={{ padding:'7px 12px', borderRadius:20, fontSize:13, fontWeight:500, background:'#534AB7', color:'#fff', border:'none', cursor:'pointer' }}>✂️ Propagate</button>
          <button onClick={() => { setModal('add'); setError('') }} style={{ padding:'7px 12px', borderRadius:20, fontSize:13, fontWeight:500, background:'#1D9E75', color:'#fff', border:'none', cursor:'pointer' }}>+ Add</button>
        </div>
      </div>

      {/* SUMMARY */}
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

      {/* STAGE FILTERS */}
      <div style={{ display:'flex', gap:6, padding:'0 16px', overflowX:'auto', scrollbarWidth:'none', marginBottom:12 }}>
        <Pill label={`All (${active.length})`} active={filterStage==='all'} onClick={() => setFilterStage('all')} />
        {Object.entries(stageCounts).filter(([,n])=>n>0).map(([s,n]) => (
          <Pill key={s} label={`${s} (${n})`} active={filterStage===s} onClick={() => setFilterStage(s)} color={STAGE_COLORS[s]} />
        ))}
      </div>

      {/* SEARCH */}
      <div style={{ padding:'0 16px', marginBottom:12 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plants…"
          style={{ width:'100%', padding:'9px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#1a1a1a', background:'#f5f5f5', outline:'none', boxSizing:'border-box' }} />
      </div>

      {/* PLANT LIST */}
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {loading ? <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>Loading…</div>
        : filtered.length===0 ? <div style={{ fontSize:14, color:'#999', padding:'12px 0' }}>No plants found</div>
        : filtered.map((p,i) => {
          const age    = p['Date Added'] ? Math.floor((new Date()-new Date(p['Date Added']))/86400000) : null
          const isOld  = age > 120 && p['Mother Plant'] !== 'Yes'
          const margin = p['Cost (CAD)'] && p['Sell Price (CAD)'] ? Math.round(((p['Sell Price (CAD)']-p['Cost (CAD)'])/p['Sell Price (CAD)'])*100) : null
          const isOpen = selected === i

          return (
            <div key={i} onClick={() => setSelected(isOpen ? null : i)}
              style={{ background:'#fff', border:`0.5px solid ${isOld?'#EF9F27':'#e5e5e5'}`, borderLeft:`3px solid ${STAGE_COLORS[p.Status]||'#e5e5e5'}`, borderRadius:'0 10px 10px 0', padding:'12px 13px', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>{p['Plant Name']}</div>
                  <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:STAGE_COLORS[p.Status]+'22', color:STAGE_COLORS[p.Status] }}>{p.Status}</span>
                    {p.Source && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#f5f5f5', color:'#666' }}>{p.Source}</span>}
                    {p['Mother Plant']==='Yes' && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#EEEDFE', color:'#534AB7' }}>Mother</span>}
                    {p.Qty > 1 && <span style={{ fontSize:11, color:'#999' }}>×{p.Qty}</span>}
                    {age !== null && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:isOld?'#FAEEDA':'#f5f5f5', color:isOld?'#854F0B':'#999' }}>{age}d</span>}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{p['Cost (CAD)'] ? `CA$${parseFloat(p['Cost (CAD)']).toFixed(2)}` : <span style={{ color:'#EF9F27', fontSize:12 }}>no cost</span>}</div>
                  {margin !== null && <div style={{ fontSize:11, color:'#1D9E75', marginTop:2 }}>{margin}% margin</div>}
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:'0.5px solid #f0f0f0' }}>
                  {p.Notes && <div style={{ fontSize:12, color:'#666', marginBottom:8, fontStyle:'italic' }}>{p.Notes}</div>}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {['Mark received','Mark acclimating','Mark ready','Mark propagating','Mark sold','Mark as dead'].map(action => (
                      <button key={action} type="button"
                        onClick={e => { e.stopPropagation(); alert(`"${action}" — stage update coming soon`) }}
                        style={{ padding:'6px 11px', borderRadius:8, border:'0.5px solid #e5e5e5', background:action==='Mark as dead'?'#fff':'#f5f5f5', fontSize:12, color:action==='Mark as dead'?'#A32D2D':'#1a1a1a', cursor:'pointer' }}>
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ADD PLANT MODAL */}
      {modal === 'add' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div style={{ background:'#fff', borderRadius:'18px 18px 0 0', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', paddingBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff' }}>
              <div style={{ fontSize:17, fontWeight:500 }}>Add to inventory</div>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#999' }}>✕</button>
            </div>
            <form onSubmit={handleAddPlant} style={{ padding:'16px' }}>
              <FieldInput label="Plant name *">
                {inp('name', 'e.g. Alocasia Dragon Scale')}
              </FieldInput>

              <FieldInput label="Type (optional)">
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {TYPES.map(t => <Pill key={t} label={t} active={formType===t} onClick={()=>{ setFormType(formType===t?'':t); formRef.current.type=formType===t?'':t }} />)}
                </div>
              </FieldInput>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                <FieldInput label="Quantity">
                  {inp('qty', '1', 'number')}
                </FieldInput>
                <FieldInput label="Date added">
                  {inp('dateAdded', '', 'date')}
                </FieldInput>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                <FieldInput label="Cost paid (CAD)">
                  {inp('cost', '0.00', 'number')}
                </FieldInput>
                <FieldInput label="Sell price (CAD)">
                  {inp('sellPrice', '0.00', 'number')}
                </FieldInput>
              </div>

              <FieldInput label="Source">
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {SOURCES.map(s => <Pill key={s} label={s} active={formSource===s} onClick={()=>{ setFormSource(s); formRef.current.source=s }} />)}
                </div>
              </FieldInput>

              <FieldInput label="Status">
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {STAGES.slice(0,-2).map(s => <Pill key={s} label={s} active={formStatus===s} onClick={()=>{ setFormStatus(s); formRef.current.status=s }} color={STAGE_COLORS[s]} />)}
                </div>
              </FieldInput>

              <FieldInput label="Mother plant?">
                <div style={{ display:'flex', gap:8 }}>
                  {['Yes','No'].map(v => <Pill key={v} label={v} active={formMother===v} onClick={()=>{ setFormMother(v); formRef.current.motherPlant=v }} />)}
                </div>
              </FieldInput>

              <FieldInput label="Notes (optional)">
                {inp('notes', 'Any extra info')}
              </FieldInput>

              {error && <div style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:12 }}>{error}</div>}

              <button type="submit" disabled={saving} style={{ width:'100%', padding:15, background:saved?'#0F6E56':saving?'#ccc':'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:500, cursor:saving?'default':'pointer', minHeight:52 }}>
                {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Add to inventory'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROPAGATE MODAL */}
      {modal === 'propagate' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div style={{ background:'#fff', borderRadius:'18px 18px 0 0', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', paddingBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff' }}>
              <div>
                <div style={{ fontSize:17, fontWeight:500 }}>✂️ Log propagation</div>
                <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Creates baby plant entries from a mother</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#999' }}>✕</button>
            </div>
            <form onSubmit={handlePropagate} style={{ padding:'16px' }}>

              {active.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'#999' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🌱</div>
                  <div style={{ fontSize:15, fontWeight:500, color:'#1a1a1a', marginBottom:8 }}>No plants in inventory yet</div>
                  <div style={{ fontSize:14, lineHeight:1.6 }}>Add plants to Inventory first, then you can log propagation from them.</div>
                  <button type="button" onClick={() => setModal('add')} style={{ marginTop:20, padding:'12px 24px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:500, cursor:'pointer' }}>+ Add plant first</button>
                </div>
              ) : (
                <>
                  <FieldInput label="Select mother plant *">
                    <select value={propForm.motherName} onChange={e => setPF('motherName', e.target.value)} required
                      style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box', background:'#fff' }}>
                      <option value="">— Choose a plant —</option>
                      {active.map((p,i) => (
                        <option key={i} value={p['Plant Name']}>
                          {p['Plant Name']}{p['Cost (CAD)'] ? ` — CA$${p['Cost (CAD)']}` : ''}
                        </option>
                      ))}
                    </select>
                  </FieldInput>

                  <FieldInput label="Number of cuttings *">
                    <div style={{ display:'flex', alignItems:'center', gap:16, justifyContent:'center', padding:'8px 0' }}>
                      <button type="button" onClick={() => setPF('cuttings', Math.max(1, propForm.cuttings-1))} style={{ width:48, height:48, borderRadius:'50%', background:'#f5f5f5', border:'none', fontSize:22, cursor:'pointer' }}>−</button>
                      <span style={{ fontSize:40, fontWeight:600, color:'#534AB7', minWidth:50, textAlign:'center' }}>{propForm.cuttings}</span>
                      <button type="button" onClick={() => setPF('cuttings', propForm.cuttings+1)} style={{ width:48, height:48, borderRadius:'50%', background:'#534AB7', border:'none', fontSize:22, cursor:'pointer', color:'#fff' }}>+</button>
                    </div>
                  </FieldInput>

                  {propForm.motherName && (() => {
                    const mother = active.find(p => p['Plant Name'] === propForm.motherName)
                    const motherCost = parseFloat(mother?.['Cost (CAD)']||0)
                    if (!motherCost) return (
                      <div style={{ background:'#f5f5f5', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#666' }}>
                        No cost recorded for this plant — babies will have no cost assigned.
                      </div>
                    )
                    return (
                      <div style={{ background:'#EEEDFE', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#534AB7' }}>
                        CA${motherCost} ÷ {propForm.cuttings} = <strong>CA${(motherCost/propForm.cuttings).toFixed(2)} per baby</strong>
                      </div>
                    )
                  })()}

                  <FieldInput label="Date propagated">
                    <input type="date" value={propForm.dateAdded} onChange={e=>setPF('dateAdded',e.target.value)}
                      style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
                  </FieldInput>

                  {error && <div style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:12 }}>{error}</div>}

                  <button type="submit" disabled={saving||!propForm.motherName} style={{ width:'100%', padding:15, background:saved?'#0F6E56':saving?'#ccc':'#534AB7', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:500, cursor:saving||!propForm.motherName?'default':'pointer', minHeight:52 }}>
                    {saved?'✓ Saved!':saving?'Creating babies…':`Create ${propForm.cuttings} baby plant${propForm.cuttings!==1?'s':''}`}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

    
