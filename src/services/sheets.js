    // src/services/sheets.js
import { ensureToken } from './auth.js'

const API_KEY  = import.meta.env.VITE_SHEETS_API_KEY
const SHEET_ID = import.meta.env.VITE_SHEET_ID
const BASE     = 'https://sheets.googleapis.com/v4/spreadsheets'

// ── READ (API key — no auth needed) ──────────────────────────────────────────
export async function readSheet(tabName) {
  const url  = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(tabName)}!A1:Z2000?key=${API_KEY}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`Failed to read ${tabName}: ${res.statusText}`)
  const data = await res.json()
  const rows = data.values || []
  if (!rows.length) return []

  // Detect if first row is a merged title (only one non-empty cell)
  // If so, skip it and use row 2 as headers
  const firstRow = rows[0]
  const firstRowPopulated = firstRow.filter(Boolean).length
  
  let headerRow, dataRows
  if (firstRowPopulated <= 1 && rows.length > 1) {
    // First row is a title — use row 2 as headers, data from row 4 (skip instruction row 3)
    headerRow = rows[1]
    dataRows  = rows.slice(3) // skip title, headers, instruction row
  } else {
    // No title row — row 1 is headers
    headerRow = rows[0]
    dataRows  = rows.slice(1)
  }

  if (!headerRow) return []
  return dataRows
    .filter(row => row.some(cell => cell !== ''))
    .map(row => Object.fromEntries(headerRow.map((h, i) => [h, row[i] ?? ''])))
}

// ── WRITE (OAuth — auto-refreshes token) ─────────────────────────────────────
export async function appendRow(tabName, rowData) {
  let token
  try {
    token = await ensureToken()
  } catch(e) {
    throw new Error('Session expired — please sign out and sign back in')
  }
  if (!token) throw new Error('Not signed in — please sign in to save data')

  // Append after last row with data — A4 onwards to skip title/headers/instructions
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(tabName)}!A4:Z2000:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ values: [rowData] })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 401) throw new Error('Session expired — please sign out and sign back in')
    throw new Error(err.error?.message || `Failed to write to ${tabName}`)
  }
  return res.json()
}

// ── READERS ───────────────────────────────────────────────────────────────────
export const getInventory  = () => readSheet('Inventory')
export const getSales      = () => readSheet('Sales')
export const getPurchases  = () => readSheet('Purchases')
export const getExpenses   = () => readSheet('Expenses')
export const getPL         = () => readSheet('P&L Summary')
export const getShipments  = () => readSheet('Shipments')
export const getSuppliers  = () => readSheet('Suppliers')
export const getCustomers  = () => readSheet('Customers')

// ── WRITERS ───────────────────────────────────────────────────────────────────
export const addSale      = (row) => appendRow('Sales', row)
export const addPurchase  = (row) => appendRow('Purchases', row)
export const addExpense   = (row) => appendRow('Expenses', row)
export const addShipment  = (row) => appendRow('Shipments', row)
export const addInventory = (row) => appendRow('Inventory', row)

// ── EXCHANGE RATES ────────────────────────────────────────────────────────────
export async function getLiveRates() {
  try {
    const res  = await fetch('https://api.exchangerate-api.com/v4/latest/CAD')
    const data = await res.json()
    return { IDR: data.rates.IDR, THB: data.rates.THB, CAD: 1, updated: new Date().toISOString() }
  } catch {
    return { IDR: 11432, THB: 26.14, CAD: 1, updated: null }
  }
}

// ── CUSTOMER AUTO-CAPTURE ─────────────────────────────────────────────────────
export async function upsertCustomer({ name, email, city, province, phone, shipping, date, channel, note }) {
  if (!name || name.toLowerCase().includes('sandra')) return
  try {
    const existing = await readSheet('Customers')
    const match = existing.find(c => c['Name']?.toLowerCase() === name.toLowerCase())
    if (match) return // already exists — future: update last order
    await appendRow('Customers', [
      name,
      email || '',
      city || '',
      province || '',
      channel || '',
      date || '',
      date || '',
      1,
      '',
      'No',
      note || '',
      shipping || '',
      phone || '',
    ])
  } catch(err) {
    console.error('Customer save failed:', err)
  }
}

    
