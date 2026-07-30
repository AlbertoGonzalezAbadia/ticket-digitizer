const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ')

interface TokenResponse {
  access_token?: string
  error?: string
}

interface TokenClient {
  callback: (response: TokenResponse) => void
  requestAccessToken: (opts?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }) => TokenClient
          revoke: (token: string, done: () => void) => void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'))
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

let tokenClient: TokenClient | null = null
let accessToken: string | null = null

async function getTokenClient(): Promise<TokenClient> {
  await loadGisScript()
  if (!tokenClient) {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {},
    })
  }
  return tokenClient
}

export function getAccessToken(): string | null {
  return accessToken
}

export function isSignedIn(): boolean {
  return accessToken !== null
}

// Must be called from within a user gesture (click handler) — Google's
// consent popup can be blocked otherwise.
export async function signIn(): Promise<string> {
  const client = await getTokenClient()
  return new Promise((resolve, reject) => {
    client.callback = (response) => {
      if (response.error || !response.access_token) {
        reject(new Error(response.error || 'No se pudo iniciar sesión con Google'))
        return
      }
      accessToken = response.access_token
      resolve(response.access_token)
    }
    client.requestAccessToken({ prompt: '' })
  })
}

export async function ensureAccessToken(): Promise<string> {
  if (accessToken) return accessToken
  return signIn()
}

export function signOut(): void {
  if (accessToken && window.google) {
    window.google.accounts.oauth2.revoke(accessToken, () => {})
  }
  accessToken = null
}

// Access tokens from the GIS token client expire after about an hour with
// no built-in refresh. Without this, ensureAccessToken() would keep handing
// out the same dead token forever once it expires — every sync (including
// "Reintentar") would fail identically, with no recovery except the user
// discovering they have to manually disconnect/reconnect in Settings.
// Callers check for 401/403 from Drive/Sheets and call this so the next
// sync attempt (a fresh user click, so the consent popup won't be blocked)
// re-authenticates instead of retrying with the same stale token.
export function invalidateTokenOnAuthError(status: number): void {
  if (status === 401 || status === 403) {
    accessToken = null
  }
}
