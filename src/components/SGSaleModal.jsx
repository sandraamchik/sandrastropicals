    import React, { useState } from 'react'
import { appendRow } from '../services/sheets.js'

const PACK_SIZES = [
  { key: '30g',   label: '30g bag',  price: 15,  grams: 30  },
  { key: '300g',  label: '300g bag', price: 40,  grams: 300 },
  { key: 'other', label: 'Other',    price: null, grams: null },
]

export default function SGSaleModal({ onClose, onSaved }) {
  const [step, setStep]         = useState('size')
  const [size, setSize]         = useState(null)
  const [customPrice, setCustomPrice] = useState('')
  const [customGrams, setCustomGrams] = useState('')
  const [qty, setQty]           = useState(1)
  const [deal, setDeal]         = useState(false)
  const [payment, setPayment]   = useState('💵 Cash')
  const [customer, setCustomer] = useState('')
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const selectedSize = PACK_SIZES.find(p => p.key === size)
  const unitPrice    = size === 'other' ? parseFloat(customPrice) || 0 : selectedSize?.price || 0
  const unitGrams    = size === 'other' ? parseFloat(customGrams) || 0 : selectedSize?.grams || 0
  const totalGrams   = unitGrams * qty
  const freeUnits    = deal ? Math.floor(qty / 4) : 0
  const totalPrice   = unitPrice * (qty - freeUnits)

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const notes = [
        size !== 'other' ? selectedSize.label : `${unitGrams}g custom`,
        deal ? `Buy 4 get 1 free (${freeUnits} free)` : '',
        payment,
      ].filter(Boolean).join(' · ')

      // Write to Starkle G tab Sales section
      // Columns: Date, Grams sold, Price received (CAD), [D=auto cost], [E=auto profit], Customer, Notes
      await appendRow("'Starkle G'", [
        date,
        totalGrams,
        totalPrice,
        '', // D — cost auto-calculated by sheet formula
        '', // E — profit auto-calculated by sheet formula
        customer,
        notes,
      ])

      setTimeout(() => { onSaved?.(); onClose() }, 800)
    } catch(err) {
      setError(err.message)
      setSaving(false)
    }
  }

  function Opt({ label, sub, active, onClick }) {
    return (
      <button onClick={onClick} style={{
        width:'100%', padding:'14px 16px', marginBottom:8,
        background: active ? '#1D9E75' : '#fff',
        color: active ? '#fff' : '#1a1a1a',
        border: `1.5px solid ${active ? '#1D9E75' : '#e5e5e5'}`,
        borderRadius:12, cursor:'pointer', textAlign:'left',
        display:'flex', alignItems:'center', justifyContent:'space-between', minHeight:52,
      }}>
        <span style={{ fontSize:15, fontWeight:500 }}>{label}</span>
        {sub && <span style={{ fontSize:13, opacity:0.8 }}>{sub}</span>}
      </button>
    )
  }

  function Next({ label, disabled, onClick }) {
    return (
      <button onClick={onClick} disabled={disabled} style={{
        width:'100%', padding:15, marginTop:8,
        background: disabled ? '#e5e5e5' : '#1D9E75',
        color: disabled ? '#999' : '#fff',
        border:'none', borderRadius:12, fontSize:16, fontWeight:500,
        cursor: disabled ? 'default' : 'pointer', minHeight:52,
      }}>{label}</button>
    )
  }

  function Back({ onClick }) {
    return (
      <button onClick={onClick} style={{ width:'100%', padding:12, background:'none', border:'none', fontSize:14, color:'#999', cursor:'pointer', marginTop:4 }}>← Back</button>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:'#fff', borderRadius:'18px 18px 0 0', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', paddingBottom:32 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff' }}>
          <div>
            <div style={{ fontSize:17, fontWeight:600 }}>Log Starkle G sale</div>
            <div style={{ fontSize:12, color:'#999', marginTop:2 }}>
              {step==='size' && 'Choose pack size'}
              {step==='qty'  && `${selectedSize?.label||'Custom'} — quantity`}
              {step==='deal' && 'Any deal applied?'}
              {step==='confirm' && 'Review & save'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#999', padding:4 }}>✕</button>
        </div>

        <div style={{ padding:'16px' }}>

          {/* STEP 1 — SIZE */}
          {step==='size' && (
            <>
              {PACK_SIZES.map(p => (
                <Opt key={p.key} label={p.label} sub={p.price ? `CA$${p.price}` : 'Enter price'} active={size===p.key} onClick={() => setSize(p.key)} />
              ))}
              {size==='other' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:4, marginBottom:8 }}>
                  <div>
                    <label style={{ fontSize:12, color:'#999', marginBottom:5, display:'block' }}>Price (CA$)</label>
                    <input type="number" value={customPrice} onChange={e=>setCustomPrice(e.target.value)} placeholder="0" min="0" step="0.01"
                      style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:44, boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:'#999', marginBottom:5, display:'block' }}>Grams per unit</label>
                    <input type="number" value={customGrams} onChange={e=>setCustomGrams(e.target.value)} placeholder="0"
                      style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:44, boxSizing:'border-box' }} />
                  </div>
                </div>
              )}
              <Next label="Next →" disabled={!size||(size==='other'&&!customPrice)} onClick={() => setStep('qty')} />
            </>
          )}

          {/* STEP 2 — QTY */}
          {step==='qty' && (
            <>
              <div style={{ textAlign:'center', padding:'12px 0 20px' }}>
                <div style={{ fontSize:13, color:'#999', marginBottom:12 }}>How many {selectedSize?.label||'units'}?</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:24 }}>
                  <button onClick={() => setQty(q=>Math.max(1,q-1))} style={{ width:52, height:52, borderRadius:'50%', background:'#f5f5f5', border:'none', fontSize:24, cursor:'pointer' }}>−</button>
                  <div style={{ fontSize:48, fontWeight:600, minWidth:60, textAlign:'center', color:'#1D9E75' }}>{qty}</div>
                  <button onClick={() => setQty(q=>q+1)} style={{ width:52, height:52, borderRadius:'50%', background:'#1D9E75', border:'none', fontSize:24, cursor:'pointer', color:'#fff' }}>+</button>
                </div>
                <div style={{ marginTop:16, fontSize:14, color:'#666' }}>
                  {totalGrams>0 && <span>{totalGrams}g · </span>}
                  <span style={{ fontWeight:600, color:'#1D9E75' }}>CA${unitPrice*qty}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:16, justifyContent:'center' }}>
                {[1,2,3,4,5,10].map(n => (
                  <button key={n} onClick={() => setQty(n)} style={{ width:44, height:36, borderRadius:8, border:'0.5px solid #e5e5e5', background:qty===n?'#1a1a1a':'#fff', color:qty===n?'#fff':'#666', fontSize:14, cursor:'pointer', fontWeight:500 }}>{n}</button>
                ))}
              </div>
              <Next label="Next →" onClick={() => setStep('deal')} />
              <Back onClick={() => setStep('size')} />
            </>
          )}

          {/* STEP 3 — DEAL */}
          {step==='deal' && (
            <>
              <div style={{ fontSize:15, fontWeight:500, marginBottom:16, textAlign:'center' }}>Did you apply a deal?</div>
              <Opt label="No deal" sub="Full price" active={!deal} onClick={() => setDeal(false)} />
              <Opt label="Buy 4 get 1 free" sub={qty>=4?`${freeUnits} free unit${freeUnits!==1?'s':''}`:'Need at least 4 units'} active={deal} onClick={() => setDeal(true)} />
              <Next label="Next →" onClick={() => setStep('confirm')} />
              <Back onClick={() => setStep('qty')} />
            </>
          )}

          {/* STEP 4 — CONFIRM */}
          {step==='confirm' && (
            <>
              <div style={{ background:'#f5f5f5', borderRadius:12, padding:16, marginBottom:16 }}>
                <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Sale summary</div>
                {[
                  ['Pack', selectedSize?.label||'Custom'],
                  ['Qty', `${qty} unit${qty!==1?'s':''}`],
                  totalGrams>0 ? ['Grams', `${totalGrams}g`] : null,
                  deal&&freeUnits>0 ? ['Deal', `Buy 4 get 1 (${freeUnits} free)`] : null,
                  ['Total', `CA$${totalPrice.toFixed(2)}`],
                ].filter(Boolean).map(([label,val]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #e5e5e5' }}>
                    <span style={{ fontSize:13, color:'#666' }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:500, color:label==='Total'?'#1D9E75':'#1a1a1a' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Payment</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {['💵 Cash','💳 Card','📲 E-transfer'].map(p => (
                    <button key={p} onClick={() => setPayment(p)} style={{ padding:'7px 13px', borderRadius:20, fontSize:13, cursor:'pointer', border:'0.5px solid #e5e5e5', minHeight:36, background:payment===p?'#1a1a1a':'#fff', color:payment===p?'#fff':'#666' }}>{p}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Customer (optional)</label>
                <input type="text" value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer name"
                  style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Date</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                  style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
              </div>

              {error && <div style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:12 }}>{error}</div>}

              <button onClick={handleSave} disabled={saving} style={{ width:'100%', padding:15, background:saving?'#ccc':'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:500, cursor:saving?'default':'pointer', minHeight:52 }}>
                {saving ? 'Saving…' : `Save CA$${totalPrice.toFixed(2)} to Starkle G tab`}
              </button>
              <Back onClick={() => setStep('deal')} />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

    
