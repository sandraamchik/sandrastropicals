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

  // Detect title row — first row where only col A has content (it's a merged title)
  // Check first 10 columns only to avoid wide Customers tab fooling detection
  const firstRow = rows[0].slice(0, 10)
  const firstRowPopulated = firstRow.filter(Boolean).length

  let headerRow, dataRows
  if (firstRowPopulated <= 1 && rows.length > 1) {
    // First row is a title — use row 2 as headers
    // Check if row 3 is an instruction row (contains words like YYYY-MM-DD or Auto)
    const row3 = rows[2] || []
    const isInstruction = row3.some(c => typeof c === 'string' && (c.includes('YYYY') || c === 'Auto' || c.includes('e.g.')))
    headerRow = rows[1]
    dataRows  = isInstruction ? rows.slice(3) : rows.slice(2)
  } else {
    headerRow = rows[0]
    dataRows  = rows.slice(1)
  }

  if (!headerRow) return []
  // Only use first N headers (non-empty) to avoid wide empty columns
  const validHeaders = headerRow.map((h, i) => ({ h, i })).filter(x => x.h)
  const lastValidCol = validHeaders.length ? validHeaders[validHeaders.length - 1].i : headerRow.length

  return dataRows
    .filter(row => row.slice(0, lastValidCol + 1).some(cell => cell !== '' && cell != null))
    .map(row => Object.fromEntries(
      headerRow.slice(0, lastValidCol + 1).map((h, i) => [h || `col${i}`, row[i] ?? ''])
    ))
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

  // Use tab name only in append URL — Google finds the last row automatically
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
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
    if (match) return
    // Write exactly 13 columns matching Customers tab:
    // Name, Email, City, Province, Source, First Order, Last Order, Total Orders, Total Spent, Repeat Customer, Wishlist/Notes, Shipping Address, Phone
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

    
