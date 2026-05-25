    import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addSale, addExpense, addInventory, getSales, getExpenses, getInventory, upsertCustomer } from '../services/sheets.js'

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
  shopify:     ['Name','Email','Lineitem name','Lineitem price','Created at'],
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

function getRowKey(type, row) {
  if (type === 'exactplants') return `${row['Date']||''}|${(row['Plant name']||row['Plant Name']||'').toLowerCase()}|${row['My price (CAD)']||''}`
  if (type === 'consignment') return `${row['Date received']||''}|${(row['Plant name']||row['Plant Name']||'').toLowerCase()}`
  if (type === 'expenses')    return `${row['Date']||''}|${(row['Category']||'').toLowerCase()}|${row['Amount (CAD)']||''}`
  if (type === 'shopify')     return `${(row['Created at']||'').slice(0,10)}|${(row['Lineitem name']||'').toLowerCase()}|${row['Lineitem price']||''}`
  return ''
}

function getExistingKey(type, row) {
  if (type === 'exactplants' || type === 'shopify') return `${row['Date']||row['Day']||(row['Created at']||'').slice(0,10)||''}|${(row['Plant Name']||row['Product title']||row['Lineitem name']||'').toLowerCase()}|${row['Sale Price (CAD)']||row['Total sales']||row['Lineitem price']||''}`
  if (type === 'consignment') return `${row['Date Added']||''}|${(row['Plant Name']||'').toLowerCase()}`
  if (type === 'expenses')    return `${row['Date']||''}|${(row['Category']||'').toLowerCase()}|${row['Amount (CAD)']||''}`
  return ''
}

function mapRow(type, row) {
  if (type === 'exactplants') return { type:'sale', data:[
    row['Date']||new Date().toISOString().slice(0,10),
    row['Plant name']||row['Plant Name']||'',
    '',1,
    row['My price (CAD)']||'',
    row['Vendor price (CAD)']||'',
    '','','Exact plant','',
    row['Paid by buyer']==='Yes'?'📲 E-transfer':'',
    'No','',
    `Buyer:${row['Buyer']||''} · Vendor:${row['Vendor']||''} · ${row['Notes']||''}`.trim()
  ]}
  if (type === 'consignment') return { type:'inventory', data:[
    row['Plant name']||row['Plant Name']||'',
    row['Type']||'',
    row['Qty received']||row['Qty']||1,
    row['Date received']||row['Date']||'',
    row['Price per unit (CAD)']||'',
    '','',
    'Okanoka',
    row['Shipment ID']||'',
    row['Mother plant?']||'No',
    row['Status']||'Received',
    row['Date received']||'',
    '','','No',
    row['Notes']||'',
  ]}
  if (type === 'expenses') return { type:'expense', data:[
    row['Date']||'',
    row['Category']||'',
    row['Amount (CAD)']||row['Amount']||'',
    row['Description']||'',
    row['Shipment ID']||'',
    row['Notes']||'',
  ]}
  if (type === 'shopify') {
    const product = row['Lineitem name'] || ''
    const price   = parseFloat(row['Lineitem price'] || 0)
    const qty     = parseInt(row['Lineitem quantity'] || 1)
    const date    = (row['Created at'] || row['Paid at'] || '').slice(0, 10)
    const order   = row['Name'] || ''
    const email   = row['Email'] || ''
    const vendor  = row['Vendor'] || ''
    const payment = row['Payment Method'] || 'Shopify Payments'
    const discount = parseFloat(row['Discount Amount'] || 0)
    const shipping = parseFloat(row['Shipping'] || 0)

    // Skip rows with no product
    if (!product) return null
    // Skip if price is 0 or negative
    if (price <= 0) return null

    const paymentTag = payment.toLowerCase().includes('paypal') ? '💳 PayPal'
      : payment.toLowerCase().includes('shopify') ? '💳 Card'
      : '💳 Card'

    const notes = [
      vendor ? `Vendor: ${vendor}` : '',
      discount > 0 ? `Discount: CA$${discount}` : '',
      shipping > 0 ? `Shipping charged: CA$${shipping}` : '',
      email ? `Email: ${email}` : '',
    ].filter(Boolean).join(' · ')

    return { type: 'sale', data: [
      date,
      product,
      'Plant', qty,
      price,
      '', '', '',
      'Website', '',
      paymentTag, 'No',
      order,
      notes,
    ], customer: {
      name:     row['Billing Name'] || row['Shipping Name'] || '',
      email:    email,
      city:     row['Billing City'] || row['Shipping City'] || '',
      province: row['Billing Province Name'] || row['Shipping Province Name'] || '',
      phone:    row['Billing Phone'] || row['Shipping Phone'] || '',
      shipping: [row['Shipping Address1'], row['Shipping Address2'], row['Shipping City'], row['Shipping Province'], row['Shipping Zip']].filter(Boolean).join(', '),
      date,
      channel:  'Website',
    }}
  }
}

function getRowDisplay(type, row) {
  const name   = row['Lineitem name']||row['Plant name']||row['Plant Name']||row['Product title']||row['Description']||row['Name']||'—'
  const amount = row['Lineitem price']||row['My price (CAD)']||row['Amount (CAD)']||row['Total sales']||row['Vendor price (CAD)']||''
  const buyer  = row['Billing Name']||row['Shipping Name']||row['Buyer']||row['Customer name']||''
  const date   = (row['Created at']||row['Paid at']||'').slice(0,10)||row['Date received']||row['Date paid']||row['Date']||row['Day']||''
  return { name, amount, buyer, date }
}

export default function Import() {
  const navigate  = useNavigate()
  const fileRef   = useRef()
  const [step, setStep]           = useState('choose')
  const [type, setType]           = useState(null)
  const [rows, setRows]           = useState([])
  const [classified, setClassified] = useState([]) // { row, status: 'new'|'duplicate'|'exists', key }
  const [errors, setErrors]       = useState([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(0)
  const [total, setTotal]         = useState(0)
  const [lastDates, setLastDates] = useState({}) // { sales, expenses, inventory }
  const [loadingDates, setLoadingDates] = useState(false)

  useEffect(() => {
    // Load last entry dates when component mounts
    async function loadLastDates() {
      setLoadingDates(true)
      try {
        const [sales, expenses, inventory] = await Promise.all([getSales(), getExpenses(), getInventory()])
        const lastDate = arr => {
          const dates = arr.map(r => r['Date']||r['Date received']||r['Date Added']||'').filter(Boolean).sort()
          return dates.length ? dates[dates.length-1] : null
        }
        setLastDates({
          sales:     lastDate(sales),
          expenses:  lastDate(expenses),
          inventory: lastDate(inventory),
          salesRows: sales,
          expensesRows: expenses,
          inventoryRows: inventory,
        })
      } catch(err) { console.error(err) }
      finally { setLoadingDates(false) }
    }
    loadLastDates()
  }, [])

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result)
      if (!parsed.length) { setErrors(['Could not read file — make sure it is saved as CSV']); return }
      const clean = cleanRows(parsed)

      // Classify each row
      const existingRows = type==='expenses' ? (lastDates.expensesRows||[])
        : type==='consignment' ? (lastDates.inventoryRows||[])
        : (lastDates.salesRows||[])

      const existingKeys = new Set(existingRows.map(r => getExistingKey(type, r)))

      const result = clean.map(row => {
        const key = getRowKey(type, row)
        // Check exact match
        if (existingKeys.has(key)) return { row, status:'exists', key }
        // Check partial match (same date + name, different amount)
        const partial = key.split('|').slice(0,2).join('|')
        const partialMatch = [...existingKeys].some(k => k.split('|').slice(0,2).join('|') === partial)
        if (partialMatch) return { row, status:'duplicate', key }
        return { row, status:'new', key }
      })

      setClassified(result)
      setRows(clean)
      setErrors([])
      setStep('preview')
    }
    reader.readAsText(file)
  }

  async function handleImport(skipExisting) {
    const toImport = skipExisting
      ? classified.filter(c => c.status === 'new')
      : classified.filter(c => c.status !== 'exists')

    setSaving(true)
    setTotal(toImport.length)
    let count = 0
    const errs = []

    for (const { row } of toImport) {
      try {
        const mapped = mapRow(type, row)
        if (!mapped) continue
        if (mapped.type === 'sale')           await addSale(mapped.data)
        else if (mapped.type === 'expense')   await addExpense(mapped.data)
        else if (mapped.type === 'inventory') await addInventory(mapped.data)

        // Auto-save customer for Shopify imports
        if (type === 'shopify' && mapped.customer?.name) {
          try {
            await upsertCustomer(mapped.customer)
          } catch(e) {
            // Don't block import if customer save fails
          }
        }

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

  const newCount       = classified.filter(c => c.status==='new').length
  const duplicateCount = classified.filter(c => c.status==='duplicate').length
  const existsCount    = classified.filter(c => c.status==='exists').length

  const tpl = TEMPLATE_TYPES.find(t => t.key === type)

  function formatDate(d) {
    if (!d) return 'No entries yet'
    return new Date(d).toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' })
  }

  const relevantDate = type==='expenses' ? lastDates.expenses
    : type==='consignment' ? lastDates.inventory
    : lastDates.sales

  return (
    <div style={{ paddingBottom:40, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff', zIndex:50 }}>
        <button onClick={() => step==='choose' ? navigate('/') : setStep(step==='preview'?'upload':'choose')}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#999', padding:0, minWidth:36, minHeight:36 }}>‹</button>
        <div>
          <div style={{ fontSize:17, fontWeight:500 }}>Import data</div>
          <div style={{ fontSize:12, color:'#999', marginTop:1 }}>Upload your existing records</div>
        </div>
      </div>

      {/* CHOOSE */}
      {step === 'choose' && (
        <div style={{ padding:'20px 16px' }}>

          {/* Last entry dates */}
          {!loadingDates && (
            <div style={{ background:'#f5f5f5', borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Your sheet — last entries</div>
              {[
                { label:'Sales',     date: lastDates.sales     },
                { label:'Expenses',  date: lastDates.expenses  },
                { label:'Inventory', date: lastDates.inventory },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'0.5px solid #e5e5e5' }}>
                  <span style={{ fontSize:13, color:'#666' }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:500, color: r.date?'#1a1a1a':'#ccc' }}>{formatDate(r.date)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Choose what you're importing</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
            {TEMPLATE_TYPES.map(t => (
              <button key={t.key} onClick={() => { setType(t.key); setStep('upload') }}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'14px', background:'#fff', border:'0.5px solid #e5e5e5', borderRadius:12, cursor:'pointer', textAlign:'left' }}
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

          <div style={{ background:'#f5f5f5', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#666', lineHeight:1.6 }}>
            📋 Need templates? Ask Claude for <strong style={{ color:'#1a1a1a' }}>Sandras Tropicals Import Templates v2</strong>
          </div>
        </div>
      )}

      {/* UPLOAD */}
      {step === 'upload' && tpl && (
        <div style={{ padding:'20px 16px' }}>
          <div style={{ background:tpl.color+'12', border:`0.5px solid ${tpl.color}44`, borderRadius:12, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:500, color:tpl.color, marginBottom:4 }}>{tpl.icon} {tpl.label}</div>
            <div style={{ fontSize:13, color:'#666' }}>{tpl.desc}</div>
          </div>

          {/* Show last entry date for this type */}
          {relevantDate && (
            <div style={{ background:'#E8F5E9', border:'0.5px solid #1D9E75', borderRadius:8, padding:'10px 13px', marginBottom:16, fontSize:13, color:'#0F6E56' }}>
              ℹ️ Your sheet already has data up to <strong>{formatDate(relevantDate)}</strong> — import data after this date to avoid duplicates
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#999', marginBottom:8 }}>Required columns:</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {REQUIRED_COLS[type].map(col => (
                <span key={col} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'#f5f5f5', color:'#666', border:'0.5px solid #e5e5e5' }}>{col}</span>
              ))}
            </div>
          </div>

          <div onClick={() => fileRef.current.click()}
            style={{ border:'2px dashed #e5e5e5', borderRadius:12, padding:'40px 24px', textAlign:'center', cursor:'pointer', background:'#f9f9f9', marginBottom:16 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D9E75';e.currentTarget.style.background='#f0fdf8'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e5e5';e.currentTarget.style.background='#f9f9f9'}}>
            <div style={{ fontSize:40, marginBottom:10 }}>📂</div>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>Tap to upload CSV</div>
            <div style={{ fontSize:13, color:'#999' }}>Save your spreadsheet tab as CSV first</div>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display:'none' }} />
          </div>

          {errors.map((e,i) => <div key={i} style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:8 }}>{e}</div>)}

          <div style={{ fontSize:12, color:'#999', background:'#f5f5f5', borderRadius:8, padding:'10px 12px', lineHeight:1.6 }}>
            <strong style={{ color:'#666' }}>How to save as CSV:</strong> In Excel → File → Save As → CSV. In Google Sheets → File → Download → CSV.
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {step === 'preview' && (
        <div style={{ padding:'20px 16px' }}>

          {/* Summary pills */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ padding:'8px 14px', borderRadius:20, background:'#E8F5E9', fontSize:13, fontWeight:500, color:'#0F6E56' }}>✅ {newCount} new</div>
            {duplicateCount > 0 && <div style={{ padding:'8px 14px', borderRadius:20, background:'#FAEEDA', fontSize:13, fontWeight:500, color:'#854F0B' }}>⚠️ {duplicateCount} possible duplicate</div>}
            {existsCount > 0 && <div style={{ padding:'8px 14px', borderRadius:20, background:'#f5f5f5', fontSize:13, fontWeight:500, color:'#999' }}>✓ {existsCount} already exists</div>}
          </div>

          {duplicateCount > 0 && (
            <div style={{ background:'#FAEEDA', borderLeft:'3px solid #EF9F27', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#633806', marginBottom:16, lineHeight:1.5 }}>
              {duplicateCount} row{duplicateCount>1?'s look':'s looks'} similar to entries already in your sheet. Review below — you can choose to skip or import them.
            </div>
          )}

          {/* Row list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20, maxHeight:400, overflowY:'auto' }}>
            {classified.map(({row, status}, i) => {
              const d = getRowDisplay(type, row)
              const statusConfig = {
                new:       { bg:'#fff',    border:'#e5e5e5', badge:'#E8F5E9', badgeText:'#0F6E56', label:'New'       },
                duplicate: { bg:'#FFFDF5', border:'#EF9F27', badge:'#FAEEDA', badgeText:'#854F0B', label:'Review'    },
                exists:    { bg:'#fafafa', border:'#e5e5e5', badge:'#f5f5f5', badgeText:'#999',    label:'Skip'      },
              }[status]
              return (
                <div key={i} style={{ background:statusConfig.bg, border:`0.5px solid ${statusConfig.border}`, borderRadius:10, padding:'11px 13px', display:'flex', alignItems:'center', gap:10, opacity:status==='exists'?0.6:1 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{d.name}</div>
                    <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{[d.buyer, d.date, d.amount?`CA$${d.amount}`:''].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:statusConfig.badge, color:statusConfig.badgeText, fontWeight:500, flexShrink:0 }}>{statusConfig.label}</span>
                </div>
              )
            })}
          </div>

          {errors.map((e,i) => <div key={i} style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:8 }}>{e}</div>)}

          {/* Import buttons */}
          <button onClick={() => handleImport(true)} disabled={saving||newCount===0}
            style={{ width:'100%', padding:14, background:saving||newCount===0?'#ccc':'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:500, cursor:saving||newCount===0?'default':'pointer', marginBottom:8, minHeight:50 }}>
            {saving ? `Importing… ${saved}/${total}` : `Import ${newCount} new rows`}
          </button>

          {duplicateCount > 0 && (
            <button onClick={() => handleImport(false)} disabled={saving}
              style={{ width:'100%', padding:13, background:'none', border:'0.5px solid #EF9F27', borderRadius:12, fontSize:14, color:'#854F0B', cursor:'pointer', marginBottom:8, minHeight:48 }}>
              Import all including {duplicateCount} possible duplicate{duplicateCount>1?'s':''}
            </button>
          )}

          <button onClick={() => setStep('upload')} style={{ width:'100%', padding:13, background:'none', border:'0.5px solid #e5e5e5', borderRadius:12, fontSize:14, color:'#999', cursor:'pointer', minHeight:48 }}>← Back</button>
        </div>
      )}

      {/* DONE */}
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
          <button onClick={() => { setStep('choose'); setRows([]); setClassified([]); setErrors([]); setSaved(0) }}
            style={{ width:'100%', padding:14, background:'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:500, cursor:'pointer', marginBottom:10, minHeight:50 }}>
            Import more
          </button>
          <button onClick={() => navigate('/')}
            style={{ width:'100%', padding:13, background:'none', border:'none', fontSize:14, color:'#999', cursor:'pointer' }}>
            Back to home
          </button>
        </div>
      )}
    </div>
  )
}

    
