    // src/services/sheets.js
import { ensureToken } from './auth.js'

const API_KEY  = import.meta.env.VITE_SHEETS_API_KEY
const SHEET_ID = import.meta.env.VITE_SHEET_ID
const BASE     = 'https://sheets.googleapis.com/v4/spreadsheets'

// ── READ (API key — no auth needed) ──────────────────────────────────────────
export async function readSheet(tabName) {
  const url  = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(tabName)}!A1:Z1000?key=${API_KEY}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`Failed to read ${tabName}: ${res.statusText}`)
  const data = await res.json()
  const [headers, ...rows] = data.values || []
  if (!headers) return []
  // Skip merged title row if it exists (only one cell populated)
  const realHeaders = headers.filter(Boolean).length > 1 ? headers : null
  if (!realHeaders) {
    const [, hdrs, ...dataRows] = data.values || []
    if (!hdrs) return []
    return dataRows.map(row => Object.fromEntries(hdrs.map((h,i) => [h, row[i] ?? ''])))
  }
  return rows.map(row => Object.fromEntries(realHeaders.map((h,i) => [h, row[i] ?? ''])))
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

  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ values: [rowData] })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // Token expired — tell user to sign in again
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

    
