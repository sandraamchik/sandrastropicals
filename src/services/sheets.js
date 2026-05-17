    // src/services/sheets.js
// Reads and writes to your Google Sheet via the Sheets API

const API_KEY = import.meta.env.VITE_SHEETS_API_KEY
const SHEET_ID = import.meta.env.VITE_SHEET_ID
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

// ── READ ──────────────────────────────────────────────────────────────────────
export async function readSheet(tabName) {
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(tabName)}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to read ${tabName}: ${res.statusText}`)
  const data = await res.json()
  const [headers, ...rows] = data.values || []
  if (!headers) return []
  return rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  )
}

// ── APPEND ────────────────────────────────────────────────────────────────────
export async function appendRow(tabName, rowData) {
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowData] })
  })
  if (!res.ok) throw new Error(`Failed to append to ${tabName}: ${res.statusText}`)
  return res.json()
}

// ── SPECIFIC TAB READERS ──────────────────────────────────────────────────────
export const getInventory  = () => readSheet('Inventory')
export const getSales      = () => readSheet('Sales')
export const getPurchases  = () => readSheet('Purchases')
export const getExpenses   = () => readSheet('Expenses')
export const getPL         = () => readSheet('P&L Summary')
export const getShipments  = () => readSheet('Shipments')
export const getSuppliers  = () => readSheet('Suppliers')
export const getCustomers  = () => readSheet('Customers')

// ── SPECIFIC TAB WRITERS ──────────────────────────────────────────────────────
export const addSale = (row)     => appendRow('Sales', row)
export const addPurchase = (row) => appendRow('Purchases', row)
export const addExpense = (row)  => appendRow('Expenses', row)
export const addShipment = (row) => appendRow('Shipments', row)
export const addInventory = (row)=> appendRow('Inventory', row)

// ── EXCHANGE RATES ────────────────────────────────────────────────────────────
export async function getLiveRates() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/CAD')
    const data = await res.json()
    return {
      IDR: data.rates.IDR,
      THB: data.rates.THB,
      CAD: 1,
      updated: new Date().toISOString()
    }
  } catch {
    // fallback rates if API fails
    return { IDR: 11432, THB: 26.14, CAD: 1, updated: null }
  }
}

    
