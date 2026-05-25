    import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addSale } from '../services/sheets.js'

const CHANNELS = ['Show','Website','Instagram','Facebook','Exact plant','Other']
const PAYMENTS = ['💵 Cash','💳 Card','📲 E-transfer','🛍 Shopify']

export default function PhotoLog() {
  const navigate  = useNavigate()
  const fileRef   = useRef()
  const canvasRef = useRef()
  const [step, setStep]       = useState('capture') // capture | review | saving | done
  const [photos, setPhotos]   = useState([]) // [{file, preview, text, name, price, channel, payment}]
  const [scanning, setScanning] = useState(false)
  const [current, setCurrent] = useState(0)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(0)

  // Load Tesseract from CDN
  useEffect(() => {
    if (window.Tesseract) return
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js'
    document.head.appendChild(script)
  }, [])

  async function handlePhotos(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setScanning(true)
    setStep('scanning')

    const results = []
    for (const file of files) {
      const preview = URL.createObjectURL(file)
      let text = ''
      let name = ''

      try {
        if (window.Tesseract) {
          const result = await window.Tesseract.recognize(file, 'eng', {
            logger: () => {}
          })
          text = result.data.text || ''
          // Extract plant name — take longest line that looks like a plant name
          // Filter out short words, numbers, prices
          const lines = text.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 4 && !/^\$|^CA\$|^\d/.test(l))
          name = lines[0] || ''
        }
      } catch(err) {
        console.error('OCR error:', err)
      }

      results.push({
        file, preview, text,
        name: name.trim(),
        price: '',
        channel: 'Show',
        payment: '💵 Cash',
        cash: 'Yes',
        date: new Date().toISOString().slice(0,10),
        customer: '',
        saved: false,
        error: '',
      })
    }

    setPhotos(results)
    setCurrent(0)
    setScanning(false)
    setStep('review')
  }

  function updatePhoto(i, key, val) {
    setPhotos(p => p.map((ph, idx) => idx === i ? { ...ph, [key]: val } : ph))
  }

  async function saveAll() {
    setSaving(true)
    let count = 0
    for (let i = 0; i < photos.length; i++) {
      const ph = photos[i]
      if (ph.saved || !ph.name || !ph.price) continue
      try {
        await addSale([
          ph.date, ph.name, ph.customer, '', 1, parseFloat(ph.price),
          '', '', '', ph.channel, '',
          ph.payment, ph.payment === '💵 Cash' ? 'Yes' : 'No', '', 'Photo log'
        ])
        updatePhoto(i, 'saved', true)
        count++
        setSaved(count)
        await new Promise(r => setTimeout(r, 1100))
      } catch(err) {
        updatePhoto(i, 'error', err.message)
      }
    }
    setSaving(false)
    setStep('done')
  }

  const readyToSave = photos.filter(p => !p.saved && p.name && p.price).length

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', paddingBottom:40, maxWidth:480, margin:'0 auto' }}>

      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px 12px', borderBottom:'0.5px solid #e5e5e5', position:'sticky', top:0, background:'#fff', zIndex:50 }}>
        <button onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#999', padding:0, minWidth:36, minHeight:36 }}>‹</button>
        <div>
          <div style={{ fontSize:17, fontWeight:500 }}>Photo log</div>
          <div style={{ fontSize:12, color:'#999', marginTop:1 }}>Photograph plant tags to log sales</div>
        </div>
      </div>

      {/* CAPTURE */}
      {step === 'capture' && (
        <div style={{ padding:'32px 16px', textAlign:'center' }}>
          <div style={{ fontSize:64, marginBottom:16 }}>📷</div>
          <div style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>Photograph your plant tags</div>
          <div style={{ fontSize:14, color:'#999', marginBottom:32, lineHeight:1.6 }}>
            Take photos of your plant tags after the show. The app will read the plant name automatically — you add the price manually.
          </div>

          <button onClick={() => fileRef.current.click()} style={{ display:'block', width:'100%', padding:16, background:'#1D9E75', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:500, cursor:'pointer', marginBottom:12 }}>
            📷 Take / upload photos
          </button>
          <div style={{ fontSize:12, color:'#999' }}>You can select multiple photos at once</div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotos}
            style={{ display:'none' }}
          />
        </div>
      )}

      {/* SCANNING */}
      {step === 'scanning' && (
        <div style={{ padding:'60px 16px', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
          <div style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>Reading plant tags…</div>
          <div style={{ fontSize:14, color:'#999' }}>This may take a few seconds per photo</div>
        </div>
      )}

      {/* REVIEW */}
      {step === 'review' && (
        <div>
          {/* Progress tabs */}
          <div style={{ display:'flex', gap:6, padding:'12px 16px', overflowX:'auto', scrollbarWidth:'none', borderBottom:'0.5px solid #f0f0f0' }}>
            {photos.map((ph, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{
                padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500,
                cursor:'pointer', whiteSpace:'nowrap', border:'0.5px solid #e5e5e5', flexShrink:0,
                background: current === i ? '#1a1a1a' : ph.saved ? '#E8F5E9' : '#fff',
                color: current === i ? '#fff' : ph.saved ? '#0F6E56' : '#666',
              }}>
                {ph.saved ? '✓' : i+1}. {ph.name ? ph.name.slice(0,12) : 'unnamed'}
              </button>
            ))}
          </div>

          {/* Current photo editor */}
          {photos[current] && (
            <div style={{ padding:'16px' }}>
              {/* Photo preview */}
              <div style={{ marginBottom:16, borderRadius:12, overflow:'hidden', border:'0.5px solid #e5e5e5', background:'#f5f5f5', height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={photos[current].preview} alt="plant tag"
                  style={{ maxWidth:'100%', maxHeight:200, objectFit:'contain' }} />
              </div>

              {/* Plant name — pre-filled from OCR */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Plant name {photos[current].name ? '✓ detected' : '— type manually'}</label>
                <input
                  type="text"
                  defaultValue={photos[current].name}
                  onChange={e => updatePhoto(current, 'name', e.target.value)}
                  placeholder="e.g. Monstera Thai Constellation"
                  style={{ width:'100%', padding:'11px 13px', border:`0.5px solid ${photos[current].name ? '#1D9E75' : '#e5e5e5'}`, borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }}
                />
              </div>

              {/* Price — always manual */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Price (CAD) *</label>
                <div style={{ display:'flex', alignItems:'center', border:'0.5px solid #e5e5e5', borderRadius:9, overflow:'hidden' }}>
                  <span style={{ padding:'12px 13px', fontSize:14, fontWeight:500, color:'#999', background:'#f5f5f5', borderRight:'0.5px solid #e5e5e5', flexShrink:0 }}>CA$</span>
                  <input
                    type="number"
                    defaultValue={photos[current].price}
                    onChange={e => updatePhoto(current, 'price', e.target.value)}
                    placeholder="0"
                    min="0" step="0.01"
                    style={{ flex:1, padding:'12px', border:'none', fontSize:20, fontFamily:'inherit', fontWeight:500, outline:'none', minHeight:48 }}
                  />
                </div>
              </div>

              {/* Channel */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Channel</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {CHANNELS.map(c => (
                    <button key={c} type="button" onClick={() => updatePhoto(current, 'channel', c)} style={{
                      padding:'7px 13px', borderRadius:20, fontSize:13, cursor:'pointer',
                      border:'0.5px solid #e5e5e5', minHeight:36,
                      background: photos[current].channel === c ? '#1a1a1a' : '#fff',
                      color: photos[current].channel === c ? '#fff' : '#666',
                    }}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Payment</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {PAYMENTS.map(p => (
                    <button key={p} type="button" onClick={() => updatePhoto(current, 'payment', p)} style={{
                      padding:'7px 13px', borderRadius:20, fontSize:13, cursor:'pointer',
                      border:'0.5px solid #e5e5e5', minHeight:36,
                      background: photos[current].payment === p ? '#1a1a1a' : '#fff',
                      color: photos[current].payment === p ? '#fff' : '#666',
                    }}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Date</label>
                <input type="date" defaultValue={photos[current].date}
                  onChange={e => updatePhoto(current, 'date', e.target.value)}
                  style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
              </div>

              {/* Customer */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>Customer (optional)</label>
                <input type="text" defaultValue={photos[current].customer}
                  onChange={e => updatePhoto(current, 'customer', e.target.value)}
                  placeholder="Customer name"
                  style={{ width:'100%', padding:'11px 13px', border:'0.5px solid #e5e5e5', borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', minHeight:48, boxSizing:'border-box' }} />
              </div>

              {/* Nav between photos */}
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                {current > 0 && (
                  <button onClick={() => setCurrent(c => c-1)} style={{ flex:1, padding:13, background:'#f5f5f5', border:'none', borderRadius:12, fontSize:14, color:'#666', cursor:'pointer' }}>← Previous</button>
                )}
                {current < photos.length-1 && (
                  <button onClick={() => setCurrent(c => c+1)} style={{ flex:1, padding:13, background:'#f5f5f5', border:'none', borderRadius:12, fontSize:14, color:'#666', cursor:'pointer' }}>Next →</button>
                )}
              </div>

              {photos[current].error && (
                <div style={{ padding:'10px 13px', background:'#fceaea', borderLeft:'3px solid #A32D2D', borderRadius:'0 8px 8px 0', fontSize:13, color:'#7a2020', marginBottom:12 }}>
                  {photos[current].error}
                </div>
              )}
            </div>
          )}

          {/* Save all button */}
          <div style={{ padding:'0 16px 24px' }}>
            <button onClick={saveAll} disabled={saving || readyToSave === 0}
              style={{ width:'100%', padding:15, background: saving||readyToSave===0 ? '#ccc' : '#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:500, cursor: saving||readyToSave===0 ? 'default' : 'pointer', minHeight:52 }}>
              {saving ? `Saving… ${saved}/${readyToSave}` : `Save ${readyToSave} sale${readyToSave !== 1 ? 's' : ''} to sheet`}
            </button>
            <button onClick={() => fileRef.current.click()} style={{ width:'100%', padding:13, background:'none', border:'none', fontSize:14, color:'#1D9E75', cursor:'pointer', marginTop:8 }}>
              + Add more photos
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handlePhotos} style={{ display:'none' }} />
          </div>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && (
        <div style={{ padding:'40px 16px', textAlign:'center' }}>
          <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:500, marginBottom:8 }}>{saved} sale{saved !== 1 ? 's' : ''} logged</div>
          <div style={{ fontSize:14, color:'#999', marginBottom:32, lineHeight:1.6 }}>All saved to your Google Sheet.</div>
          <button onClick={() => { setStep('capture'); setPhotos([]); setSaved(0) }}
            style={{ width:'100%', padding:14, background:'#1D9E75', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:500, cursor:'pointer', marginBottom:10 }}>
            Log more photos
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

    
