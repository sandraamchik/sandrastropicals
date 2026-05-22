    // src/services/auth.js
const CLIENT_ID = '652571219781-b9f1ic6jjjj8qtucu34mnk0kmt1tk8rl.apps.googleusercontent.com'
const SCOPES    = 'https://www.googleapis.com/auth/spreadsheets'

let tokenClient  = null
let accessToken  = null
let tokenExpiry  = null

export function isSignedIn() {
  const stored = sessionStorage.getItem('gToken')
  const expiry  = sessionStorage.getItem('gTokenExpiry')
  if (stored && expiry && Date.now() < parseInt(expiry)) {
    accessToken  = stored
    tokenExpiry  = parseInt(expiry)
    return true
  }
  return false
}

export function getToken() {
  // Check if token is still valid (with 2 min buffer)
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 120000) {
    return accessToken
  }
  // Try session storage
  const stored = sessionStorage.getItem('gToken')
  const expiry  = parseInt(sessionStorage.getItem('gTokenExpiry') || '0')
  if (stored && Date.now() < expiry - 120000) {
    accessToken = stored
    tokenExpiry = expiry
    return stored
  }
  return null
}

export function loadGoogleAuth() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) { initClient(); resolve(); return }
    const script    = document.createElement('script')
    script.src      = 'https://accounts.google.com/gsi/client'
    script.onload   = () => { initClient(); resolve() }
    script.onerror  = () => resolve()
    document.head.appendChild(script)
  })
}

function initClient() {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     SCOPES,
    callback:  saveToken,
  })
}

function saveToken(response) {
  if (response.access_token) {
    accessToken = response.access_token
    // Tokens last 3600 seconds — store expiry
    tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000
    sessionStorage.setItem('gToken', accessToken)
    sessionStorage.setItem('gTokenExpiry', tokenExpiry.toString())
  }
}

export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject('Auth not loaded'); return }
    tokenClient.callback = (response) => {
      if (response.error) { reject(response.error); return }
      saveToken(response)
      resolve(response.access_token)
    }
    tokenClient.requestAccessToken({ prompt: isSignedIn() ? '' : 'consent' })
  })
}

// Silent refresh — call this before any write operation
export async function ensureToken() {
  if (getToken()) return getToken()
  // Token expired — refresh silently
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject('Auth not loaded'); return }
    tokenClient.callback = (response) => {
      if (response.error) { reject(response.error); return }
      saveToken(response)
      resolve(response.access_token)
    }
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

export function signOut() {
  const token = getToken()
  if (token) window.google?.accounts.oauth2.revoke(token)
  accessToken = null
  tokenExpiry = null
  sessionStorage.removeItem('gToken')
  sessionStorage.removeItem('gTokenExpiry')
}

    
