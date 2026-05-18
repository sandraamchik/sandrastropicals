    import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../services/auth.js'
import { TopBar, Field, Input, PrimaryButton } from './Nav.jsx'

export default function Settings({ onSignOut }) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    sheetUrl: localStorage.getItem('sheetUrl') || '',
    apiKey:   localStorage.getItem('apiKey')   || '',
    goal:     localStorage.getItem('goal')     || '4500',
    lowSalesAlert:   localStorage.getItem('lowSalesAlert')   !== 'false',
    agingAlert:      localStorage.getItem('agingAlert')      !== 'false',
    motherExemption: localStorage.getItem('motherExemption') !== 'false',
    missingPriceFlag:localStorage.getItem('missingPriceFlag')!== 'false',
    reorderAlerts:   localStorage.getItem('reorderAlerts')   !== 'false',
  })

  function set(key, val) { setForm(f => ({ ...f, [key]:val })) }

  function save() {
    Object.entries(form).forEach(([k,v]) => localStorage.setItem(k, v))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleSignOut() {
    signOut()
    onSignOut && onSignOut()
  }

  function Toggle({ k }) {
    return (
      <button onClick={() => set(k, !form[k])} style={{ width:44, height:26, borderRadius:13, background:form[k]?'#1D9E75':'#e5e5e5', border:'none', cursor:'pointer', position:'relative', flexShrink:0, transition:'background 0.2s', minWidth:44 }}>
        <div style={{ position:'absolute', width:20, height:20, borderRadius:'50%', background:'#fff', top:3, left:form[k]?21:3, transition:'left 0.2s' }} />
      </button>
    )
  }

  const Row = ({ label, sub, k }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'0.5px solid #f0f0f0', minHeight:56 }}>
      <div><div style={{ fontSize:14, color:'#1a1a1a' }}>{label}</div>{sub&&<div style={{ fontSize:11, color:'#999', marginTop:2 }}>{sub}</div>}</div>
      <Toggle k={k} />
    </div>
  )

  const Section = ({ title }) => <div style={{ fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10, marginTop:24 }}>{title}</div>

  return (
    <div style={{ paddingBottom:40 }}>
      <TopBar title="Settings" showBack={true} />
      <div style={{ padding:'16px' }}>
        <Section title="Google Sheets" />
        <Field label="Google Sheet URL"><Input value={form.sheetUrl} onChange={e=>set('sheetUrl',e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" /></Field>
        <Field label="API Key"><Input type="password" value={form.apiKey} onChange={e=>set('apiKey',e.target.value)} placeholder="AIza…" /></Field>

        <Section title="Business" />
        <Field label="Monthly goal (CAD)"><Input type="number" value={form.goal} onChange={e=>set('goal',e.target.value)} placeholder="4500" /></Field>

        <Section title="Alerts" />
        <Row label="Low sales warning" sub="Below 50% of goal" k="lowSalesAlert" />
        <Row label="Aging inventory" sub="Flag after 120 days" k="agingAlert" />
        <Row label="Mother plant exemption" sub="Don't flag as aging" k="motherExemption" />
        <Row label="Missing price reminders" sub="Show flag bar on home" k="missingPriceFlag" />
        <Row label="Reorder alerts" sub="Per-item thresholds" k="reorderAlerts" />

        <PrimaryButton onClick={save} style={{ marginTop:24 }} color={saved?'#0F6E56':'#1D9E75'}>
          {saved?'✓ Saved':'Save settings'}
        </PrimaryButton>

        <button onClick={handleSignOut} style={{ width:'100%', padding:14, background:'none', border:'0.5px solid #e5e5e5', borderRadius:12, fontSize:15, color:'#A32D2D', cursor:'pointer', marginTop:12, minHeight:50 }}>
          Sign out
        </button>
      </div>
    </div>
  )
}

    
