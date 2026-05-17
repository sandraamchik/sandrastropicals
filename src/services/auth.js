// src/services/auth.js
// Google OAuth for reading and writing to Google Sheets

const CLIENT_ID = '652571219781-b9f1ic6jjjj8qtucu34mnk0kmt1tk8rl.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

let tokenClient = null
let accessToken = null

export function isSignedIn() {
  return !!accessToken || !!sessionStorage.getItem('gToken')
}

export function getToken() {
  return accessToken || sessionStorage.getItem('gToken')
}

export function loadGoogleAuth() {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            accessToken = response.access_token
            sessionStorage.setItem('gToken', response.access_token)
          }
        },
      })
      resolve()
    }
    document.head.appendChild(script)
  })
}

export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject('Auth not loaded'); return }
    tokenClient.callback = (response) => {
      if (response.error) { reject(response.error); return }
      accessToken = response.access_token
      sessionStorage.setItem('gToken', response.access_token)
      resolve(response.access_token)
    }
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

export function signOut() {
  const token = getToken()
  if (token) window.google?.accounts.oauth2.revoke(token)
  accessToken = null
  sessionStorage.removeItem('gToken')
}
