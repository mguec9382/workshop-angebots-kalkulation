/* ═══════════════════════════════════════════════════════════════════════
   Cosmo Parrot (MCP) – Gegenprüfung von Anforderungen
   ───────────────────────────────────────────────────────────────────────
   Variante A: direkter Aufruf eines Cosmo-Parrot-MCP-Endpunkts (Streamable
               HTTP, JSON-RPC). Erfordert Endpunkt-URL, Bearer-Token und
               CORS-Freigabe des Servers. Das Token liegt nur in der
               sessionStorage (nie im Projektstand, nie in Dateien).
   Variante B: Prüfpaket exportieren → in VS Code mit Cosmo Parrot prüfen
               lassen → Ergebnis-JSON importieren.
   ═══════════════════════════════════════════════════════════════════════ */
import type { Requirement, RequirementParrot } from '../types'

const URL_KEY = 'cc-parrot-endpoint'
const TOKEN_KEY = 'cc-parrot-token'
const FALLBACK_SCHEMA = '2026-10-06.1'

export function loadParrotConfig(): { url: string; token: string } {
  try {
    return { url: localStorage.getItem(URL_KEY) ?? '', token: sessionStorage.getItem(TOKEN_KEY) ?? '' }
  } catch {
    return { url: '', token: '' }
  }
}

export function saveParrotConfig(url: string, token: string): void {
  try {
    localStorage.setItem(URL_KEY, url.trim())
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* Speicher nicht verfügbar */
  }
}

interface RpcReply {
  result?: { content?: { type: string; text?: string }[]; isError?: boolean; [k: string]: unknown }
  error?: { message?: string }
}

async function rpc(
  url: string,
  token: string,
  body: Record<string, unknown>,
  sessionId: string | null,
): Promise<{ reply: RpcReply | null; sessionId: string | null }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
    },
    body: JSON.stringify(body),
  })
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
export async function openParrot(
  url: string,
  token: string,
): Promise<(req: Requirement) => Promise<RequirementParrot>> {
  let sid: string | null = null
  let id = 1
  const call = async (method: string, params: Record<string, unknown>, notify = false) => {
    const body: Record<string, unknown> = { jsonrpc: '2.0', method, params }
    if (!notify) body.id = id++
    const r = await rpc(url, token, body, sid)
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
