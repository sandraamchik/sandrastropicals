    import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { addSale, addExpense, addInventory } from '../services/sheets.js'
import { TopBar, PrimaryButton, SectionTitle } from './Nav.jsx'

const TEMPLATE_TYPES = [
  { key:'exactplants', label:'Exact Plants & Imports', icon:'🌱', color:'#378ADD', desc:'Plants sourced for customers or yourself — any vendor, any country' },
  { key:'consignment', label:'Okanoka Consignment',    icon:'🇮🇩', color:'#1D9E75', desc:'Mother plants and stock held for shows or online sales' },
  { key:'expenses',    label:'Past Expenses',          icon:'🧾', color:'#A32D2D', desc:'Show fees, shipping, clearance, supplies, gas' },
  { key:'shopify',     label:'Shopify Export',         icon:'🛍', color:'#5C6AC4', desc:'Export from Shopify Orders → Export → CSV' },
]

const REQUIRED_COLS = {
  exactplants: ['Buyer','Vendor','Plant name','Vendor price (CAD)'],
  consignment: ['Date received','Plant name','Qty received','Price per unit (CAD)'],
  expenses:    ['Date','Category','Amount (CAD)'],
  shopify:     ['Name','Total'],
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || line.split(',')
    return Object.fromEntries(headers.map((h,i) => [h, (vals[i]||'').trim().replace(/^"|"$/g,'')]))
  }).filter(row => Object.values(row).some(v => v))
}

function cleanRows(rows) {
  return rows.filter(r => {
    const vals = Object.values(r).join(' ').toLowerCase()
    return !vals.includes('example') && !vals.includes('delete me') && !vals.includes('yyyy-mm-dd')
  })
}

function mapRow(type, row) {
  if (type === 'exactplants') {
    return {
      type: 'sale',
      data: [
        row['Date'] || new Date().toISOString().slice(0,10),
        row['Plant name'] || row['Plant Name'] || '',
        '', // type
        1,
        row['My price (CAD)'] || '',
        row['Vendor price (CAD)'] || '',
        '', '', // margin
        'Exact plant',
        '',
        row['Paid by buyer'] === 'Yes' ? '📲 E-transfer' : '',
        'No',
        '',
        `Buyer: ${row['Buyer']||''} · Vendor: ${row['Vendor']||''} · ${row['Notes']||''}`.trim(),
      ]
    }
  }
  if (type === 'consignment') {
    return {
      type: 'inventory',
      data: [
        row['Plant name'] || row['Plant Name'] || '',
        row['Type'] || '',
        row['Qty received'] || row['Qty'] || 1,
        row['Date received'] || row['Date'] || '',
        row['Price per unit (CAD)'] || '',
        '', '', // sell price, margin
        'Okanoka',
        row['Shipment ID'] || '',
        row['Mother plant?'] || 'No',
        row['Status'] || 'Received',
        row['Date received'] || '',
        '','','No',
        row['Notes'] || '',
      ]
    }
  }
  if (type === 'expenses') {
    return {
      type: 'expense',
      data: [
        row['Date'] || '',
        row['Category'] || '',
        row['Amount (CAD)'] || row['Amount'] || '',
        row['Description'] || '',
        row['Shipment ID'] || '',
        row['Notes'] || '',
      ]
    }
  }
  if (type === 'shopify') {
    return {
      type: 'sale',
      data: [
        row['Created at']?.slice(0,10) || '',
        row['Lineitem name'] || row['Name'] || 'Shopify order',
        '','',
        row['Total'] || row['Lineitem price'] || '',
        '','','',
        'Website','',
        '🛍 Shopify','No','',
        row['Name'] || '',
      ]
    }
  }
}

export default function Import() {
  const navigate  = useNavigate()
  const fileRef   = useRef()
  const [step, setStep]     = useState('choose')
  const [type, setType]     = useState(null)
  const [rows, setRows]     = useState([])
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(0)
  const [total, setTotal]   = useState(0)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result)
      if (!parsed.length) { setErrors(['Could not read file — make sure it is saved as CSV']); return }
      const clean = cleanRows(parsed)
      setRows(clean)
      setErrors([])
      setStep('preview')
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    setSaving(true)
    setTotal(rows.length)
    let count = 0
    const errs = []
    for (const row of rows) {
      try {
        const mapped = mapRow(type, row)
        if (!mapped) continue
        if (mapped.type === 'sale')      await addSale(mapped.data)
        else if (mapped.type === 'expense')   await addExpense(mapped.data)
        else if (mapped.type === 'inventory') await addInventory(mapped.data)
        count++
        setSaved(count)
      } catch(err) {
        errs.push(`Row ${count+1}: ${err.message}`)
      }
    }
    setSaving(false)
    if (errs.length) setErrors(errs)
    setStep('done')
  }

  const tpl = TEMPLATE_TYPES.find(t => t.key === type)

  return (
    <div style={{ paddingBottom:40 }}>
      <TopBar title="Import data" subtitle="Upload your existing records" showBack={true} />

      {step === 'choose' && (
        <div style={{ padding:'20px 16px' }}>
          <SectionTitle>Choose what you're importing</SectionTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
            {TEMPLATE_TYPES.map(t => (
              <button key={t.key} onClick={() => { setType(t.key); setStep('upload') }} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px', background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, cursor:'pointer', textAlign:'left' }}
                onMouseEnter={e=>e.currentTarget.style.background='#f9f9f9'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <div style={{ width:46, height:46, borderRadius:10, background:t.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{t.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>{t.label}</div>
                  <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{t.desc}</div>
                </div>
                <span style={{ fontSize:20, color:'#ccc' }}>›</span>
              </button>
            ))}
          </div>
          <div style={{ background:'#f5f5f5', borderRadius:12, padding:14, fontSize:13, color:'#666', lineHeight:1.6 }}>
            📋 Need the import templates? Ask Claude to download <strong style={{ color:'#1a1a1a' }}>Sandras Tropicals Import Templates v2</strong> from this chat.
          </div>
        </div>
      )}

      {step === 'upload' && tpl && (
        <div style={{ padding:'20px 16px' }}>
          <div style={{ background:tpl.color+'12', border:`0.5px solid ${tpl.color}44`, borderRadius:12, padding:14, marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:500, color:tpl.color, marginBottom:4 }}>{tpl.icon} {tpl.label}</div>
            <div style={{ fontSize:13, color:'#666' }}>{tpl.desc}</div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#999', marginBottom:8 }}>Required columns:</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {REQUIRED_COLS[type].map(col => (
                <span key={col} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'#f5f5f5', color:'#666', border:'0.5px solid #e5e5e5' }}>{col}</span>
              ))}
            </div>
          </div>

          <div onClick={() => fileRef.current.click()} style={{ border:'2px dashed #e5e5e5', borderRadius:12, padding:'40px 24px', textAlign:'center', cursor:'pointer', background:'#f9f9f9', marginBottom:16 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D9E75';e.currentTarget.style.background='#f0fdf8'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e5e5';e.currentTarget.style.background='#f9f9f9'}}>
            <div style={{ fontSize:40, marginBottom:10 }}>📂</div>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>Tap to upload CSV</div>
            <div style={{ fontSize:13, color:'#999' }}>Save your spreadsheet tab as CSV first</div>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display:'none' }} />
          </div>

          {errors.map((e,i) => <div key={i} style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:8 }}>{e}</div>)}

          <div style={{ fontSize:12, color:'#999', background:'#f5f5f5', borderRadius:8, padding:'10px 12px', lineHeight:1.6, marginBottom:12 }}>
            <strong style={{ color:'#666' }}>How to save as CSV:</strong> In Excel → File → Save As → CSV. In Google Sheets → File → Download → CSV.
          </div>
          <button onClick={() => setStep('choose')} style={{ width:'100%', padding:13, background:'none', border:'0.5px solid #e5e5e5', borderRadius:12, fontSize:14, color:'#999', cursor:'pointer' }}>← Back</button>
        </div>
      )}

      {step === 'preview' && (
        <div style={{ padding:'20px 16px' }}>
          <div style={{ background:'#E8F5E9', border:'0.5px solid #1D9E75', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:500, color:'#1D9E75', marginBottom:2 }}>✓ {rows.length} rows found</div>
            <div style={{ fontSize:12, color:'#2a6e4a' }}>Review before importing to your Google Sheet</div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20, maxHeight:380, overflowY:'auto' }}>
            {rows.slice(0,25).map((row,i) => {
              const name   = row['Plant name']||row['Plant Name']||row['Lineitem name']||row['Description']||row['Name']||`Row ${i+1}`
              const amount = row['My price (CAD)']||row['Amount (CAD)']||row['Total']||row['Vendor price (CAD)']||''
              const buyer  = row['Buyer']||''
              const date   = row['Date received']||row['Date paid']||row['Date']||row['Created at']?.slice(0,10)||''
              return (
                <div key={i} style={{ background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:10, padding:'11px 13px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'#1D9E75', color:'#fff', fontSize:11, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{name}</div>
                    <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{[buyer, date, amount?`CA$${amount}`:''].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
              )
            })}
            {rows.length > 25 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:8 }}>+ {rows.length-25} more rows</div>}
          </div>

          {errors.map((e,i) => <div key={i} style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:8 }}>{e}</div>)}

          <PrimaryButton onClick={handleImport} disabled={saving}>
            {saving ? `Importing… ${saved}/${total}` : `Import ${rows.length} rows to Google Sheet`}
          </PrimaryButton>
          <button onClick={() => setStep('upload')} style={{ width:'100%', padding:13, background:'none', border:'0.5px solid #e5e5e5', borderRadius:12, fontSize:14, color:'#999', cursor:'pointer', marginTop:10 }}>← Back</button>
        </div>
      )}

      {step === 'done' && (
        <div style={{ padding:'20px 16px', textAlign:'center' }}>
          <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:500, marginBottom:8 }}>{saved} rows imported</div>
          <div style={{ fontSize:14, color:'#999', marginBottom:24, lineHeight:1.6 }}>Your Google Sheet has been updated. Check the relevant tab to confirm everything looks right.</div>
          {errors.length > 0 && (
            <div style={{ background:'#fceaea', borderRadius:10, padding:14, marginBottom:20, textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#7a2020', marginBottom:8 }}>{errors.length} rows had errors:</div>
              {errors.map((e,i) => <div key={i} style={{ fontSize:12, color:'#7a2020', marginBottom:4 }}>{e}</div>)}
            </div>
          )}
          <PrimaryButton onClick={() => { setStep('choose'); setRows([]); setErrors([]); setSaved(0) }}>Import more</PrimaryButton>
          <button onClick={() => navigate('/')} style={{ width:'100%', padding:13, background:'none', border:'none', fontSize:14, color:'#999', cursor:'pointer', marginTop:10 }}>Back to home</button>
        </div>
      )}
    </div>
  )
}

    
