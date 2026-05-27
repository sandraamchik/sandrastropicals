    // src/services/sheets.js
import { ensureToken } from './auth.js'

const API_KEY  = import.meta.env.VITE_SHEETS_API_KEY
const SHEET_ID = import.meta.env.VITE_SHEET_ID
const BASE     = 'https://sheets.googleapis.com/v4/spreadsheets'

// Tab structure: which row has headers, which row data starts
const TAB_CONFIG = {
  'Sales':       { headerRow: 2, dataRow: 4 },  // row1=title, row2=headers, row3=instructions
  'Expenses':    { headerRow: 2, dataRow: 3 },  // row1=title, row2=headers, data from row3
  'Inventory':   { headerRow: 2, dataRow: 3 },  // row1=title, row2=headers, data from row3
  'Purchases':   { headerRow: 2, dataRow: 3 },
  'Shipments':   { headerRow: 2, dataRow: 3 },
  'Suppliers':   { headerRow: 2, dataRow: 3 },
  'Pipeline':    { headerRow: 2, dataRow: 3 },
  'Customers':   { headerRow: 2, dataRow: 3 },
  'P&L Summary': { headerRow: 3, dataRow: 4 },  // row1=title, row2=note, row3=headers
  'Starkle G':   { headerRow: 20, dataRow: 22 },
}

// ── READ (API key — no auth needed) ──────────────────────────────────────────
export async function readSheet(tabName) {
  const config = TAB_CONFIG[tabName] || { headerRow: 1, dataRow: 2 }
  const url    = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(tabName)}!A1:Z2000?key=${API_KEY}`
  const res    = await fetch(url)
  if (!res.ok) throw new Error(`Failed to read ${tabName}: ${res.statusText}`)
  const data   = await res.json()
  const rows   = data.values || []
  if (!rows.length) return []

  const headerRow = rows[config.headerRow - 1]
  const dataRows  = rows.slice(config.dataRow - 1)

  if (!headerRow) return []

  const validHeaders = headerRow.map((h,i) => ({h,i})).filter(x => x.h)
  const lastCol      = validHeaders.length ? validHeaders[validHeaders.length-1].i : headerRow.length

  return dataRows
    .filter(row => row.slice(0, lastCol+1).some(cell => cell !== '' && cell != null))
    .map(row => Object.fromEntries(
      headerRow.slice(0, lastCol+1).map((h,i) => [h||`col${i}`, row[i] ?? ''])
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

  // Google Sheets append requires range format: TabName!A1 or 'Tab Name'!A1
  // Must NOT use encodeURIComponent on the full range — only encode spaces
  let rangeStr
  if (tabName.includes(' ') || tabName.includes('&')) {
    rangeStr = `'${tabName}'!A1`
  } else {
    rangeStr = `${tabName}!A1`
  }
  // Only encode spaces, leave ! ' & intact
  const encodedRange = rangeStr.replace(/ /g, '%20')
  const url = `${BASE}/${SHEET_ID}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
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

    
