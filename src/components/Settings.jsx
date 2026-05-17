import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    sheetUrl: localStorage.getItem('sheetUrl') || '',
    apiKey:   localStorage.getItem('apiKey')   || '',
    goal:     localStorage.getItem('goal')     || '4500',
    currency: localStorage.getItem('currency') || 'CAD',
    lowSalesAlert:    localStorage.getItem('lowSalesAlert')    !== 'false',
    agingAlert:       localStorage.getItem('agingAlert')       !== 'false',
    motherExemption:  localStorage.getItem('motherExemption')  !== 'false',
    missingPriceFlag: localStorage.getItem('missingPriceFlag') !== 'false',
    reorderAlerts:    localStorage.getItem('reorderAlerts')    !== 'false',
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function save() {
    Object.entries(form).forEach(([k, v]) => localStorage.setItem(k, v))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function Toggle({ k }) {
    return (
      <button onClick={() => set(k, !form[k])} style={{
        width:40, height:24, borderRadius:12,
        background: form[k] ? '#1D9E75' : '#e5e5e5',
        border:'none', cursor:'pointer', position:'relative', flexShrink:0, transition:'background 0.2s'
      }}>
        <div style={{
          position:'absolute', width:18, height:18, borderRadius:'50%', background:'#fff',
          top:3, left: form[k] ? 19 : 3, transition:'left 0.2s'
        }} />
      </button>
    )
  }

  const Field = ({ label, k, type='text', placeholder='' }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, color:'#999', marginBottom:6, display:'block' }}>{label}</label>
      <input
        type={type} value={form[k]} placeholder={placeholder}
        onChange={e => set(k, e.target.value)}
        style={{ width:'100%', padding:'10px 12px', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:13, fontFamily:'inherit', color:'#1a1a1a', background:'#fff' }}
      />
    </div>
  )

  const Row = ({ label, sub, k }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'0.5px solid #f0f0f0' }}>
      <div>
        <div style={{ fontSize:14, color:'#1a1a1a' }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{sub}</div>}
      </div>
      <Toggle k={k} />
    </div>
  )

  const Section = ({ title }) => (
    <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10, marginTop:24 }}>{title}</div>
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5' }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#999', padding:0 }}>‹</button>
        <div style={{ fontSize:18, fontWeight:500 }}>Settings</div>
      </div>

      <div style={{ padding:'16px' }}>

        <Section title="Google Sheets" />
        <Field label="Google Sheet URL" k="sheetUrl" placeholder="https://docs.google.com/spreadsheets/d/…" />
        <Field label="API Key" k="apiKey" type="password" placeholder="AIza…" />

        <Section title="Business" />
        <Field label="Monthly goal (CAD)" k="goal" type="number" placeholder="4500" />

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Home currency</label>
          <div style={{ display:'flex', gap:8 }}>
            {['CAD','USD','EUR'].map(c => (
              <button key={c} onClick={() => set('currency', c)} style={{
                padding:'7px 16px', borderRadius:20, fontSize:13, fontWeight:500, cursor:'pointer',
                border:'0.5px solid #e5e5e5',
                background: form.currency === c ? '#1a1a1a' : '#fff',
                color: form.currency === c ? '#fff' : '#666'
              }}>{c}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:'#999', marginBottom:8, display:'block' }}>Purchase currencies</label>
          <div style={{ fontSize:13, color:'#666', padding:'10px 12px', background:'#f5f5f5', borderRadius:8 }}>IDR · THB</div>
        </div>

        <Section title="Alerts & preferences" />
        <Row label="Low sales warning" sub="Below 50% of goal" k="lowSalesAlert" />
        <Row label="Aging inventory" sub="Flag after 120 days" k="agingAlert" />
        <Row label="Mother plant exemption" sub="Don't flag as aging" k="motherExemption" />
        <Row label="Missing price reminders" sub="Show flag bar on home" k="missingPriceFlag" />
        <Row label="Reorder alerts" sub="Per-item thresholds" k="reorderAlerts" />

        <button onClick={save} style={{
          width:'100%', padding:13, background: saved ? '#0F6E56' : '#1D9E75',
          color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:500,
          cursor:'pointer', marginTop:20, transition:'background 0.2s'
        }}>
          {saved ? '✓ Saved' : 'Save settings'}
        </button>

      </div>
    </div>
  )
}
