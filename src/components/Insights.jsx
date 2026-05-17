// src/components/Insights.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Insights() {
  const navigate = useNavigate()
  return (
    <div>
      <div style={{ padding:'16px 16px 12px', borderBottom:'0.5px solid #e5e5e5' }}>
        <div style={{ fontSize:18, fontWeight:500 }}>Insights</div>
        <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Predictions & recommendations</div>
      </div>
      <div style={{ padding:24, textAlign:'center', color:'#999' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>💡</div>
        <div style={{ fontSize:15, fontWeight:500, color:'#1a1a1a', marginBottom:8 }}>Coming soon</div>
        <div style={{ fontSize:14, lineHeight:1.6 }}>Insights will appear here once you have a few months of data in your sheet. Check back after logging your first sales and expenses.</div>
      </div>
    </div>
  )
}
