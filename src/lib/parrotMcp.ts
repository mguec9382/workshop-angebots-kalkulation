/* ═══════════════════════════════════════════════════════════════════════
   Cosmo Parrot (MCP) – Gegenprüfung von Anforderungen
   ───────────────────────────────────────────────────────────────────────
   Variante A: direkter Aufruf des Cosmo-Parrot-MCP-Servers (Streamable HTTP,
               JSON-RPC) nach Anmeldung per OAuth 2.1 (Authorization Code +
               PKCE, dynamische Client-Registrierung) im Popup. Die Tokens
               liegen nur in der sessionStorage. Der Server erlaubt Browser-
               Aufrufe nur von *.cosmoconsult.com und localhost (CORS).
   Variante B: Prüfpaket exportieren → in VS Code mit Cosmo Parrot prüfen
               lassen → Ergebnis-JSON importieren.
   ═══════════════════════════════════════════════════════════════════════ */
import type { Requirement, RequirementParrot } from '../types'

const URL_KEY = 'cc-parrot-endpoint'
const SESSION_KEY = 'cc-parrot-oauth'
const CLIENT_KEY = 'cc-parrot-client:'
const FALLBACK_SCHEMA = '2026-10-06.1'

export const DEFAULT_PARROT_URL = 'https://mcp.platform.cosmoconsult.com/mcp'

export function loadParrotUrl(): string {
  try {
    return localStorage.getItem(URL_KEY) || DEFAULT_PARROT_URL
  } catch {
    return DEFAULT_PARROT_URL
  }
}

export function saveParrotUrl(url: string): void {
  try {
    localStorage.setItem(URL_KEY, url.trim())
  } catch {
    /* Speicher nicht verfügbar */
  }
}

/* ───────────── OAuth 2.1 (PKCE) ───────────── */

interface OAuthSession {
  access: string
  refresh?: string
  expiresAt: number
  clientId: string
  tokenEndpoint: string
  resource: string
}

function readSession(): OAuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as OAuthSession) : null
  } catch {
    return null
  }
}

export function isParrotLoggedIn(): boolean {
  const s = readSession()
  return !!s && (s.expiresAt > Date.now() || !!s.refresh)
}

export function parrotLogout(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${new URL(url).pathname}: HTTP ${res.status}`)
  return (await res.json()) as T
}

const CORS_HINT =
  'Der Server hat die Anfrage blockiert (CORS). Die Anmeldung funktioniert nur, wenn die Plattform lokal (localhost) oder unter einer cosmoconsult.com-Adresse läuft – sonst bitte das Prüfpaket verwenden.'

async function tokenRequest(endpoint: string, params: Record<string, string>): Promise<Omit<OAuthSession, 'clientId' | 'tokenEndpoint' | 'resource'>> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params),
  })
  if (!res.ok) throw new Error(`Token-Anfrage fehlgeschlagen (HTTP ${res.status})`)
  const t = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number }
  return { access: t.access_token, refresh: t.refresh_token, expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000 }
}

/** Meldet per OAuth-Popup bei Cosmo Parrot an (muss direkt aus einem Klick aufgerufen werden). */
export async function parrotLogin(mcpUrl: string): Promise<void> {
  // Popup sofort öffnen, damit der Browser es nicht als unaufgeforderten Popup blockiert
  const popup = window.open('', 'cc-parrot-login', 'width=520,height=720')
  if (!popup) throw new Error('Popup wurde blockiert – bitte Popups für diese Seite erlauben.')
  try {
    const u = new URL(mcpUrl)
    const prm = await getJson<{ resource?: string; authorization_servers?: string[] }>(
      `${u.origin}/.well-known/oauth-protected-resource${u.pathname === '/' ? '' : u.pathname}`,
    )
    const issuer = prm.authorization_servers?.[0]
    if (!issuer) throw new Error('Kein Autorisierungsserver gefunden.')
    const as = await getJson<{
      authorization_endpoint: string
      token_endpoint: string
      registration_endpoint?: string
      scopes_supported?: string[]
    }>(`${new URL(issuer).origin}/.well-known/oauth-authorization-server`)

    const redirectUri = new URL('oauth-callback.html', window.location.href).toString()
    const clientCacheKey = CLIENT_KEY + redirectUri
    let clientId = localStorage.getItem(clientCacheKey)
    if (!clientId) {
      if (!as.registration_endpoint) throw new Error('Der Server erlaubt keine Client-Registrierung.')
      const reg = await getJson<{ client_id: string }>(as.registration_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'COSMO Workshop- & Angebots-Kalkulations-Plattform',
          redirect_uris: [redirectUri],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        }),
      })
      clientId = reg.client_id
      localStorage.setItem(clientCacheKey, clientId)
    }

    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)))
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    const state = b64url(crypto.getRandomValues(new Uint8Array(16)))
    const resource = prm.resource ?? mcpUrl

    const auth = new URL(as.authorization_endpoint)
    auth.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      resource,
      scope: (as.scopes_supported ?? ['.default']).join(' '),
    }).toString()

    // Callback-Seite meldet das Ergebnis über einen BroadcastChannel (robust gegen COOP/opener-Verlust)
    const channel = new BroadcastChannel('cc-parrot-oauth')
    const result = await new Promise<{ code?: string; error?: string }>((resolve, reject) => {
      const timer = window.setInterval(() => {
        if (popup.closed) {
          cleanup()
          reject(new Error('Anmeldung abgebrochen.'))
        }
      }, 800)
      const cleanup = () => {
        window.clearInterval(timer)
        channel.close()
      }
      channel.onmessage = (ev: MessageEvent<{ state?: string; code?: string; error?: string }>) => {
        if (ev.data?.state !== state) return
        cleanup()
        resolve(ev.data)
      }
      popup.location.href = auth.toString()
    })
    if (!result.code) throw new Error(result.error || 'Anmeldung fehlgeschlagen.')

    const tok = await tokenRequest(as.token_endpoint, {
      grant_type: 'authorization_code',
      code: result.code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
      resource,
    })
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...tok, clientId, tokenEndpoint: as.token_endpoint, resource } satisfies OAuthSession),
    )
  } catch (e) {
    if (e instanceof TypeError) throw new Error(CORS_HINT)
    throw e
  } finally {
    if (!popup.closed) popup.close()
  }
}

/** Liefert ein gültiges Access-Token (bei Bedarf per Refresh-Token erneuert). */
async function accessToken(): Promise<string> {
  const s = readSession()
  if (!s) throw new Error('Nicht bei Cosmo Parrot angemeldet.')
  if (s.expiresAt - 30_000 > Date.now()) return s.access
  if (!s.refresh) {
    parrotLogout()
    throw new Error('Anmeldung abgelaufen – bitte erneut anmelden.')
  }
  try {
    const tok = await tokenRequest(s.tokenEndpoint, {
      grant_type: 'refresh_token',
      refresh_token: s.refresh,
      client_id: s.clientId,
      resource: s.resource,
    })
    const next: OAuthSession = { ...s, ...tok, refresh: tok.refresh ?? s.refresh }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
    return next.access
  } catch {
    parrotLogout()
    throw new Error('Anmeldung abgelaufen – bitte erneut anmelden.')
  }
}

interface RpcReply {
  result?: { content?: { type: string; text?: string }[]; isError?: boolean; [k: string]: unknown }
  error?: { message?: string }
}

async function rpc(
  url: string,
  body: Record<string, unknown>,
  sessionId: string | null,
): Promise<{ reply: RpcReply | null; sessionId: string | null }> {
  const token = await accessToken()
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${token}`,
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(CORS_HINT)
  }
  if (res.status === 401) {
    parrotLogout()
    throw new Error('Nicht autorisiert – bitte erneut anmelden.')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const sid = res.headers.get('Mcp-Session-Id') ?? sessionId
  const raw = await res.text()
  if (!raw.trim()) return { reply: null, sessionId: sid }
  let json = raw
  if ((res.headers.get('Content-Type') ?? '').includes('text/event-stream')) {
    const datas = raw.split(/\r?\n/).filter((l) => l.startsWith('data:'))
    json = datas.length ? datas[datas.length - 1].slice(5) : ''
  }
  return { reply: json.trim() ? (JSON.parse(json) as RpcReply) : null, sessionId: sid }
}

const textOf = (r: RpcReply | null): string =>
  (r?.result?.content ?? []).map((c) => c.text ?? '').join('\n').trim()

/** Öffnet eine MCP-Session und liefert eine Prüffunktion je Anforderung. */
export async function openParrot(url: string): Promise<(req: Requirement) => Promise<RequirementParrot>> {
  let sid: string | null = null
  let id = 1
  const call = async (method: string, params: Record<string, unknown>, notify = false) => {
    const body: Record<string, unknown> = { jsonrpc: '2.0', method, params }
    if (!notify) body.id = id++
    const r = await rpc(url, body, sid)
    sid = r.sessionId
    if (r.reply?.error) throw new Error(r.reply.error.message || 'MCP-Fehler')
    return r.reply
  }

  await call('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'cc-workshop-plattform', version: '1.0' },
  })
  await call('notifications/initialized', {}, true)

  let schemaVersion = FALLBACK_SCHEMA
  try {
    const d = await call('tools/call', { name: 'core-describe', arguments: { action: 'search-cosmo-docs' } })
    const parsed = JSON.parse(textOf(d)) as { schemaVersion?: string }
    if (parsed.schemaVersion) schemaVersion = parsed.schemaVersion
  } catch {
    /* Fallback-Schema verwenden */
  }

  return async (req) => {
    const message =
      `Gibt es in der COSMO-CONSULT-Dokumentation ein Produkt oder Feature (Microsoft Dynamics 365 Business Central, COSMO-Apps), ` +
      `das folgende Anforderung eines Interessenten abdeckt? Nenne passende Lösungen und Quellen. Anforderung: „${req.text}“` +
      (req.assigned ? ` MBPC-Zuordnung: ${req.assigned.label}.` : '')
    try {
      const r = await call('tools/call', {
        name: 'core-read',
        arguments: { action: 'search-cosmo-docs', schemaVersion, parameters: { message: message.slice(0, 11000) } },
      })
      if (r?.result?.isError) return result('error', textOf(r) || 'Parrot meldet einen Fehler.')
      return result(textOf(r).length < 20 ? 'nohit' : 'checked', textOf(r))
    } catch (e) {
      return result('error', e instanceof Error ? e.message : 'Unbekannter Fehler')
    }
  }
}

function result(state: RequirementParrot['state'], text: string, sources?: string[]): RequirementParrot {
  const urls = sources ?? [...new Set(text.match(/https?:\/\/[^\s"'<>)\]]+/g) ?? [])].slice(0, 5)
  return {
    state,
    summary: text.replace(/\s+/g, ' ').trim().slice(0, 600),
    sources: urls,
    checkedAt: new Date().toISOString(),
  }
}

/* ───────────── Variante B: Prüfpaket (Export / Import) ───────────── */

/** Prüfauftrag für die Gegenprüfung mit Cosmo Parrot (z. B. im VS-Code-Chat). */
export function buildParrotPackage(reqs: Requirement[]): string {
  return JSON.stringify(
    {
      type: 'cc-parrot-check-request',
      instructions:
        'Prüfe jede Anforderung mit Cosmo Parrot (search-cosmo-docs, ggf. search-cosmo-loop) gegen COSMO CONSULT Produkte und Microsoft Dynamics 365 Business Central. ' +
        'Antworte ausschließlich mit JSON im Format {"results":[{"id":"<id>","state":"checked|nohit","summary":"<max. 400 Zeichen>","sources":["<url>"]}]}. ' +
        'Ohne Treffer: state "nohit". Erfinde keine Quellen.',
      requirements: reqs.map((r) => ({ id: r.id, ref: r.ref, text: r.text, mbpc: r.assigned?.label ?? null })),
    },
    null,
    2,
  )
}

/** Liest ein Prüfergebnis (Variante B) und liefert Ergebnisse je Requirement-ID. */
export function parseParrotResults(raw: string): Map<string, RequirementParrot> {
  const data = JSON.parse(raw) as unknown
  const list = Array.isArray(data) ? data : (data as { results?: unknown[] })?.results
  if (!Array.isArray(list)) throw new Error('Ungültiges Format: erwartet {"results":[…]}.')
  const out = new Map<string, RequirementParrot>()
  for (const e of list as { id?: string; state?: string; summary?: string; sources?: string[] }[]) {
    if (!e?.id) continue
    const state = e.state === 'nohit' || e.state === 'error' ? e.state : 'checked'
    out.set(e.id, result(state, String(e.summary ?? ''), Array.isArray(e.sources) ? e.sources.map(String).slice(0, 5) : []))
  }
  return out
}
