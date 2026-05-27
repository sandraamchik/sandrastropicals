    import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addSale, addExpense, addInventory, addPurchase, getSales, getExpenses, getInventory, upsertCustomer } from '../services/sheets.js'

const TEMPLATE_TYPES = [
  { key:'exactplants', label:'Exact Plants & Imports', icon:'🌱', color:'#378ADD', desc:'Your Notion CSV — Buyer, Vendor, Plant name, My price, Vendor price…' },
  { key:'purchases',   label:'Purchases',              icon:'🛒', color:'#BA7517', desc:'Plants you bought — Date, Plant Name, Supplier, Qty, CAD Equiv, Status' },
  { key:'consignment', label:'Okanoka Consignment',    icon:'🇮🇩', color:'#1D9E75', desc:'Mother plants and stock held for shows or online sales' },
  { key:'expenses',    label:'Past Expenses',          icon:'🧾', color:'#A32D2D', desc:'Show fees, shipping, clearance, supplies, gas' },
  { key:'shopify',     label:'Shopify Orders Export',  icon:'🛍', color:'#5C6AC4', desc:'orders_export.csv from Shopify Admin → Orders → Export' },
]

const REQUIRED_COLS = {
  exactplants: ['Buyer','Vendor','Plant name','My price'],
  purchases:   ['Plant Name','Supplier','Qty','CAD Equiv'],
  consignment: ['Date received','Plant name','Qty received','Price per unit (CAD)'],
  expenses:    ['Date','Category','Amount (CAD)'],
  shopify:     ['Name','Email','Lineitem name','Lineitem price','Created at'],
}

// Sales tab columns (in order):
// Date | Plant Name | Customer | Vendor | Qty | Sale Price (CAD) | Cost of Plant (CAD) | Margin $ | Margin % | Channel | Show Name | Payment | Cash (CRA exclude) | Shipment ID | Notes
function saleRow({ date, plant, customer, vendor, qty, salePrice, costPrice, channel, showName, payment, cash, shipmentId, notes }) {
  return [
    date || '',       // A: Date
    plant || '',      // B: Plant Name
    customer || '',   // C: Customer
    vendor || '',     // D: Vendor
    qty || 1,         // E: Qty
    salePrice || '',  // F: Sale Price (CAD)
    costPrice || '',  // G: Cost of Plant (CAD)
    '',               // H: Margin $ — leave blank, formula in sheet calculates it
    '',               // I: Margin % — leave blank, formula in sheet calculates it
    channel || '',    // J: Channel
    showName || '',   // K: Show Name
    payment || '',    // L: Payment
    cash || 'No',     // M: Cash (CRA exclude)
    shipmentId || '', // N: Shipment ID
    notes || '',      // O: Notes
  ]
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
  return lines.slice(1).map(line => {
    const vals = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote }
      else if (line[i] === ',' && !inQuote) { vals.push(cur); cur = '' }
      else { cur += line[i] }
    }
    vals.push(cur)
    return Object.fromEntries(headers.map((h,i) => [h, (vals[i]||'').trim()]))
  }).filter(row => Object.values(row).some(v => v))
}

function cleanRows(rows) {
  return rows.filter(r => {
    const vals = Object.values(r).join(' ').toLowerCase()
    return !vals.includes('example') && !vals.includes('delete me') && !vals.includes('yyyy-mm-dd')
  })
}

function getRowKey(type, row) {
  if (type === 'exactplants') return `${row['Buyer']||''}|${(row['Plant name']||'').toLowerCase()}|${row['My price']||''}`
  if (type === 'purchases')   return `${row['Date']||''}|${(row['Plant Name']||row['Plant name']||'').toLowerCase()}|${row['CAD Equiv']||''}`
  if (type === 'consignment') return `${row['Date received']||''}|${(row['Plant name']||'').toLowerCase()}`
  if (type === 'expenses')    return `${row['Date']||''}|${(row['Category']||'').toLowerCase()}|${row['Amount (CAD)']||''}`
  if (type === 'shopify')     return `${(row['Created at']||'').slice(0,10)}|${(row['Lineitem name']||'').toLowerCase()}|${row['Lineitem price']||''}`
  return ''
}

function getExistingKey(type, row) {
  if (type === 'exactplants') return `${(row['Customer']||'').toLowerCase()}|${(row['Plant Name']||'').toLowerCase()}|${row['Sale Price (CAD)']||''}`
  if (type === 'purchases')   return `${row['Date']||''}|${(row['Plant Name']||'').toLowerCase()}|${row['CAD Equiv']||''}`
  if (type === 'consignment') return `${row['Date Added']||''}|${(row['Plant Name']||'').toLowerCase()}`
  if (type === 'expenses')    return `${row['Date']||''}|${(row['Category']||'').toLowerCase()}|${row['Amount (CAD)']||''}`
  if (type === 'shopify')     return `${row['Date']||''}|${(row['Plant Name']||'').toLowerCase()}|${row['Sale Price (CAD)']||''}`
  return ''
}

function getShopifyExistingKey(row) {
  // Match against Sales tab: Date in col A, Plant Name in col B, Sale Price in col F
  return `${row['Date']||''}|${(row['Plant Name']||'').toLowerCase()}|${String(row['Sale Price (CAD)']||'')}`
}

function getShopifyIncomingKey(row) {
  // Match incoming Shopify row: date from Created at, plant from Lineitem name, price from Lineitem price
  return `${(row['Created at']||'').slice(0,10)}|${(row['Lineitem name']||'').toLowerCase()}|${String(row['Lineitem price']||'')}`
}

function mapRow(type, row) {
  // ── PURCHASES ─────────────────────────────────────────────────────────────
  if (type === 'purchases') {
    const plant    = (row['Plant Name']||row['Plant name']||'').trim()
    const supplier = (row['Supplier']||row['Source']||'').trim()
    const qty      = row['Qty']||1
    const cadEquiv = parseFloat(row['CAD Equiv']||row['CAD equiv']||0)||''
    const date     = row['Date']||new Date().toISOString().slice(0,10)
    const status   = row['Status']||'On order'
    const notes    = row['Notes']||''
    if (!plant) return null
    return { type:'purchase', data:[
      date, plant, supplier, qty,
      row['Price Paid (orig)']||'',
      row['Currency']||'',
      cadEquiv,
      row['Exchange Rate']||'',
      row['Shipment ID']||'',
      supplier,
      row['Mother Plant']||'No',
      status,
      notes,
    ]}
  }

  // ── EXACT PLANTS ──────────────────────────────────────────────────────────
  if (type === 'exactplants') {
    const parseP = v => {
      if (!v) return ''
      const n = parseFloat(v.toString().replace('CA$','').replace(',','').trim())
      return isNaN(n) ? '' : n
    }
    const buyer       = (row['Buyer']||'').trim()
    const vendor      = (row['Vendor']||'').trim()
    const plant       = (row['Plant name']||'').trim()
    const myPrice     = parseP(row['My price'])
    const vendorPrice = parseP(row['Vendor price'])
    const packingFee  = parseP(row['Packing fee']) || 0
    const country     = (row['Country']||'').trim()
    const paid        = (row['Paid']||'').trim()
    const date        = (row['Date']||'').trim() || new Date().toISOString().slice(0,10)
    const comments    = (row['Comments']||row['Notes']||'').trim()

    if (!plant && !myPrice) return null

    const customer = buyer.toLowerCase().includes('sandra') ? '' : buyer

    return {
      type: 'sale',
      data: saleRow({
        date,
        plant,
        customer,
        vendor,
        qty: 1,
        salePrice: myPrice,
        costPrice: vendorPrice,
        channel: 'Exact plant',
        payment: paid === 'Yes' ? '📲 E-transfer' : '',
        cash: 'No',
        notes: [
          country ? `Country: ${country}` : '',
          packingFee > 0 ? `Packing: CA$${packingFee}` : '',
          comments,
        ].filter(Boolean).join(' · '),
      }),
      customer: customer ? { name: customer, date, channel: 'Exact plant', note: plant } : null
    }
  }

  // ── CONSIGNMENT ───────────────────────────────────────────────────────────
  if (type === 'consignment') {
    return { type:'inventory', data:[
      row['Plant name']||'',
      '',
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
  }

  // ── EXPENSES ──────────────────────────────────────────────────────────────
  if (type === 'expenses') {
    return { type:'expense', data:[
      row['Date']||'',
      row['Category']||'',
      row['Amount (CAD)']||row['Amount']||'',
      row['Description']||'',
      row['Shipment ID']||'',
      row['Notes']||'',
    ]}
  }

  // ── SHOPIFY ORDERS EXPORT ─────────────────────────────────────────────────
  if (type === 'shopify') {
    const product     = row['Lineitem name'] || ''
    const price       = parseFloat(row['Lineitem price'] || 0)
    const qty         = parseInt(row['Lineitem quantity'] || 1)
    const date        = (row['Created at'] || row['Paid at'] || '').slice(0, 10)
    const order       = row['Name'] || ''
    const email       = row['Email'] || ''
    const vendor      = row['Vendor'] || ''
    const discount    = parseFloat(row['Discount Amount'] || 0)
    const shipping    = parseFloat(row['Shipping'] || 0)
    const payment     = row['Payment Method'] || ''
    const billingName = row['Billing Name'] || ''
    const shippingName= row['Shipping Name'] || ''
    const customerName= billingName || shippingName || ''

    if (!product || price <= 0) return null

    const payTag = payment.toLowerCase().includes('paypal') ? '💳 PayPal' : '💳 Card'
    const notes = [
      email ? `Email: ${email}` : '',
      discount > 0 ? `Discount: CA$${discount}` : '',
      shipping > 0 ? `Shipping: CA$${shipping}` : '',
    ].filter(Boolean).join(' · ')

    const customer = customerName ? {
      name:     customerName,
      email,
      city:     row['Billing City'] || row['Shipping City'] || '',
      province: row['Billing Province Name'] || row['Shipping Province Name'] || '',
      phone:    row['Billing Phone'] || row['Shipping Phone'] || '',
      shipping: [row['Shipping Address1'], row['Shipping Address2'], row['Shipping City'], row['Shipping Province'], row['Shipping Zip']].filter(Boolean).join(', '),
      date,
      channel: 'Website',
    } : null

    return {
      type: 'sale',
      data: saleRow({
        date,
        plant:    product,
        customer: customerName,
        vendor,
        qty,
        salePrice: price,
        channel:  'Website',
        payment:  payTag,
        cash:     'No',
        shipmentId: order,
        notes,
      }),
      customer,
    }
  }
}

function getRowDisplay(type, row) {
  const name   = row['Plant name']||row['Plant Name']||row['Lineitem name']||row['Description']||'—'
  const amount = row['My price']||row['CAD Equiv']||row['CAD equiv']||row['Lineitem price']||row['Amount (CAD)']||''
  const buyer  = row['Buyer']||row['Supplier']||row['Billing Name']||row['Shipping Name']||''
  const date   = row['Date']||(row['Created at']||'').slice(0,10)||row['Date received']||''
  return { name, amount, buyer, date }
}

export default function Import() {
  const navigate  = useNavigate()
  const fileRef   = useRef()
  const [step, setStep]             = useState('choose')
  const [type, setType]             = useState(null)
  const [classified, setClassified] = useState([])
  const [errors, setErrors]         = useState([])
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(0)
  const [total, setTotal]           = useState(0)
  const [lastDates, setLastDates]   = useState({})
  const [loadingDates, setLoadingDates] = useState(false)

  useEffect(() => {
    async function loadLastDates() {
      setLoadingDates(true)
      try {
        const [sales, expenses, inventory] = await Promise.all([getSales(), getExpenses(), getInventory()])
        const lastDate = arr => {
          const dates = arr.map(r => r['Date']||r['Date received']||r['Date Added']||'').filter(Boolean).sort()
          return dates.length ? dates[dates.length-1] : null
        }
        setLastDates({
          sales: lastDate(sales), expenses: lastDate(expenses), inventory: lastDate(inventory),
          salesRows: sales, expensesRows: expenses, inventoryRows: inventory,
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

      const existingRows = type==='expenses' ? (lastDates.expensesRows||[])
        : type==='consignment' ? (lastDates.inventoryRows||[])
        : (lastDates.salesRows||[])

      const existingKeys = new Set(existingRows.map(r => 
        type === 'shopify' ? getShopifyExistingKey(r) : getExistingKey(type, r)
      ))

      const result = clean.map(row => {
        const mapped = mapRow(type, row)
        if (!mapped) return null
        const key = type === 'shopify' ? getShopifyIncomingKey(row) : getRowKey(type, row)
        if (existingKeys.has(key)) return { row, status:'exists', key }
        const partial = key.split('|').slice(0,2).join('|')
        const partialMatch = [...existingKeys].some(k => k.split('|').slice(0,2).join('|') === partial)
        if (partialMatch) return { row, status:'duplicate', key }
        return { row, status:'new', key }
      }).filter(Boolean)

      setClassified(result)
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
        if (!mapped) { count++; setSaved(count); continue }

        if (mapped.type === 'sale')           await addSale(mapped.data)
        else if (mapped.type === 'expense')   await addExpense(mapped.data)
        else if (mapped.type === 'inventory') await addInventory(mapped.data)
        else if (mapped.type === 'purchase')  await addPurchase(mapped.data)

        count++
        setSaved(count)
        // Stay under Google's 60 writes/min limit
        await new Promise(r => setTimeout(r, 1100))
      } catch(err) {
        errs.push(`Row ${count+1}: ${err.message}`)
        // If quota error, wait longer before continuing
        if (err.message?.includes('Quota') || err.message?.includes('quota')) {
          await new Promise(r => setTimeout(r, 5000))
        }
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
    : type==='consignment' ? lastDates.inventory : lastDates.sales

  return (
    <div style={{ paddingBottom:40, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff', zIndex:50 }}>
        <button onClick={() => step==='choose' ? navigate('/') : setStep(step==='preview'?'upload':'choose')}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#999', padding:0, minWidth:36, minHeight:36 }}>‹</button>
        <div>
          <div style={{ fontSize:17, fontWeight:500 }}>Import data</div>
          <div style={{ fontSize:12, color:'#999', marginTop:1 }}>Upload your existing records</div>
        </div>
      </div>

      {step === 'choose' && (
        <div style={{ padding:'20px 16px' }}>
          {!loadingDates && (
            <div style={{ background:'#f5f5f5', borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Last entries in your sheet</div>
              {[{label:'Sales',date:lastDates.sales},{label:'Expenses',date:lastDates.expenses},{label:'Inventory',date:lastDates.inventory}].map(({label,date}) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'0.5px solid #e5e5e5' }}>
                  <span style={{ fontSize:13, color:'#666' }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:500, color:date?'#1a1a1a':'#ccc' }}>{formatDate(date)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Choose what you're importing</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
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
        </div>
      )}

      {step === 'upload' && tpl && (
        <div style={{ padding:'20px 16px' }}>
          <div style={{ background:tpl.color+'12', border:`0.5px solid ${tpl.color}44`, borderRadius:12, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:500, color:tpl.color, marginBottom:4 }}>{tpl.icon} {tpl.label}</div>
            <div style={{ fontSize:13, color:'#666' }}>{tpl.desc}</div>
          </div>

          {relevantDate && (
            <div style={{ background:'#E8F5E9', border:'0.5px solid #1D9E75', borderRadius:8, padding:'10px 13px', marginBottom:16, fontSize:13, color:'#0F6E56' }}>
              ℹ️ Sheet has data up to <strong>{formatDate(relevantDate)}</strong>
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#999', marginBottom:8 }}>Required columns in your CSV:</div>
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
            <div style={{ fontSize:13, color:'#999' }}>Export as CSV first</div>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display:'none' }} />
          </div>

          {errors.map((e,i) => <div key={i} style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:8 }}>{e}</div>)}

          <div style={{ fontSize:12, color:'#999', background:'#f5f5f5', borderRadius:8, padding:'10px 12px', lineHeight:1.6 }}>
            <strong style={{ color:'#666' }}>Save as CSV:</strong> Excel → File → Save As → CSV · Google Sheets → File → Download → CSV · Notion → ··· → Export → CSV
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div style={{ padding:'20px 16px' }}>
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ padding:'8px 14px', borderRadius:20, background:'#E8F5E9', fontSize:13, fontWeight:500, color:'#0F6E56' }}>✅ {newCount} new</div>
            {duplicateCount>0 && <div style={{ padding:'8px 14px', borderRadius:20, background:'#FAEEDA', fontSize:13, fontWeight:500, color:'#854F0B' }}>⚠️ {duplicateCount} possible duplicate</div>}
            {existsCount>0 && <div style={{ padding:'8px 14px', borderRadius:20, background:'#f5f5f5', fontSize:13, fontWeight:500, color:'#999' }}>✓ {existsCount} already exists</div>}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20, maxHeight:400, overflowY:'auto' }}>
            {classified.map(({row,status},i) => {
              const d = getRowDisplay(type, row)
              const cfg = {
                new:       { bg:'#fff',    border:'#e5e5e5', badge:'#E8F5E9', badgeText:'#0F6E56', label:'New'    },
                duplicate: { bg:'#FFFDF5', border:'#EF9F27', badge:'#FAEEDA', badgeText:'#854F0B', label:'Review' },
                exists:    { bg:'#fafafa', border:'#e5e5e5', badge:'#f5f5f5', badgeText:'#999',    label:'Skip'   },
              }[status]
              return (
                <div key={i} style={{ background:cfg.bg, border:`0.5px solid ${cfg.border}`, borderRadius:10, padding:'11px 13px', display:'flex', alignItems:'center', gap:10, opacity:status==='exists'?0.6:1 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{d.name}</div>
                    <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{[d.buyer,d.date,d.amount?`CA$${d.amount}`:''].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:cfg.badge, color:cfg.badgeText, fontWeight:500, flexShrink:0 }}>{cfg.label}</span>
                </div>
              )
            })}
          </div>

          {errors.map((e,i) => <div key={i} style={{ background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', padding:'10px 13px', fontSize:13, color:'#7a2020', marginBottom:8 }}>{e}</div>)}

          <button onClick={() => handleImport(true)} disabled={saving||newCount===0}
            style={{ width:'100%', padding:14, background:saving||newCount===0?'#ccc':'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:500, cursor:saving||newCount===0?'default':'pointer', marginBottom:8, minHeight:50 }}>
            {saving
              ? `Importing… ${saved}/${total} (~${Math.ceil((total-saved)*1.1/60)} min left)`
              : `Import ${newCount} new rows (~${Math.ceil(newCount*1.1/60)} min)`}
          </button>

          {duplicateCount>0 && (
            <button onClick={() => handleImport(false)} disabled={saving}
              style={{ width:'100%', padding:13, background:'none', border:'0.5px solid #EF9F27', borderRadius:12, fontSize:14, color:'#854F0B', cursor:'pointer', marginBottom:8, minHeight:48 }}>
              Import all including {duplicateCount} possible duplicate{duplicateCount>1?'s':''}
            </button>
          )}

          <button onClick={() => setStep('upload')}
            style={{ width:'100%', padding:13, background:'none', border:'0.5px solid #e5e5e5', borderRadius:12, fontSize:14, color:'#999', cursor:'pointer', minHeight:48 }}>
            ← Back
          </button>
        </div>
      )}

      {step === 'done' && (
        <div style={{ padding:'20px 16px', textAlign:'center' }}>
          <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:500, marginBottom:8 }}>{saved} rows imported</div>
          <div style={{ fontSize:14, color:'#999', marginBottom:24, lineHeight:1.6 }}>Check your Google Sheet to confirm everything looks right.</div>
          {errors.length>0 && (
            <div style={{ background:'#fceaea', borderRadius:10, padding:14, marginBottom:20, textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#7a2020', marginBottom:8 }}>{errors.length} rows had errors:</div>
              {errors.map((e,i) => <div key={i} style={{ fontSize:12, color:'#7a2020', marginBottom:4 }}>{e}</div>)}
            </div>
          )}
          <button onClick={() => { setStep('choose'); setClassified([]); setErrors([]); setSaved(0) }}
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

    
