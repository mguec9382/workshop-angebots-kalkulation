/* ═══════════════════════════════════════════════════════════════════════
   Anforderungs-Agent
   ───────────────────────────────────────────────────────────────────────
   Pipeline: Einlesen (Excel/CSV/PDF/PowerPoint/Word/Text) → Anforderungen
   extrahieren → gegen den aktiven MBPC-Prozesskatalog matchen → optional
   Gegenprüfung über Cosmo Parrot (MCP, siehe parrotMcp.ts) → Übernahme in
   den Scope des Environments (Register MBPC-Workshop).
   Alles läuft lokal im Browser; es werden keine Dateien hochgeladen.
   ═══════════════════════════════════════════════════════════════════════ */
import type { CatalogProcess, Environment, Requirement, RequirementMatch } from '../types'
import { featureKey } from '../data/catalog'
import { defaultFeatureEffort, isEffortEmpty, uid } from '../data/seed'
import { stepEffortFor } from './cosmoMbpc'

export interface RawRequirement {
  ref?: string
  text: string
  priority?: string
}

export const ACCEPTED_FILE_TYPES = '.xlsx,.xls,.xlsm,.csv,.tsv,.ods,.pdf,.pptx,.docx,.txt,.md'
const MAX_PER_FILE = 500

/* ───────────────────────── Einlesen ───────────────────────── */

function ext(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name)
  return m ? m[1].toLowerCase() : ''
}

/** Extrahiert Anforderungen aus einer Datei (Format anhand der Endung). */
export async function extractFromFile(file: File): Promise<RawRequirement[]> {
  const e = ext(file.name)
  let raws: RawRequirement[]
  if (['xlsx', 'xls', 'xlsm', 'ods', 'csv', 'tsv'].includes(e)) raws = await fromTable(file, e)
  else if (e === 'pdf') raws = fromLines(await pdfLines(file))
  else if (e === 'pptx') raws = fromLines(await pptxLines(file))
  else if (e === 'docx') raws = fromLines(await docxLines(file))
  else if (e === 'txt' || e === 'md') raws = fromLines((await file.text()).split(/\r?\n/))
  else throw new Error(`Dateityp „.${e || '?'}“ wird nicht unterstützt.`)

  const seen = new Set<string>()
  const out: RawRequirement[] = []
  for (const r of raws) {
    const text = r.text.replace(/\s+/g, ' ').trim()
    const key = text.toLowerCase()
    if (text.length < 8 || seen.has(key)) continue
    seen.add(key)
    out.push({ ...r, text })
    if (out.length >= MAX_PER_FILE) break
  }
  return out
}

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const REF_HEADERS = ['id', 'nr', 'no', 'ref', 'referenz', 'anf', 'anf nr', 'anforderungs id', 'anforderung id', 'req', 'req id', 'lfd nr', 'kennung']
const TEXT_HEADERS = ['anforderung', 'anforderungen', 'requirement', 'requirements', 'beschreibung', 'description', 'text', 'titel', 'title', 'bezeichnung', 'funktion', 'feature', 'thema', 'kriterium', 'question', 'questions', 'frage', 'fragen', 'fragestellung', 'anforderungsbeschreibung']
const PRIO_HEADERS = ['prio', 'prioritat', 'prioritaet', 'priorität', 'priority', 'muss kann', 'must have', 'kategorie']

async function fromTable(file: File, e: string): Promise<RawRequirement[]> {
  const XLSX = await import('xlsx')
  const wb =
    e === 'csv' || e === 'tsv'
      ? XLSX.read(await file.text(), { type: 'string' })
      : XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const out: RawRequirement[] = []

  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '', blankrows: false })
    if (!rows.length) continue

    // Kopfzeile in den ersten 10 Zeilen suchen
    let headerIdx = -1
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      if (rows[i].some((c) => TEXT_HEADERS.includes(norm(c)))) {
        headerIdx = i
        break
      }
    }

    let refCol = -1
    let prioCol = -1
    let textCols: number[] = []
    if (headerIdx >= 0) {
      rows[headerIdx].forEach((c, i) => {
        const h = norm(c)
        if (refCol < 0 && REF_HEADERS.includes(h)) refCol = i
        else if (prioCol < 0 && PRIO_HEADERS.includes(h)) prioCol = i
        else if (TEXT_HEADERS.includes(h) && textCols.length < 2) textCols.push(i)
      })
    } else {
      // Fallback: Spalte mit dem meisten Text
      const width = Math.max(...rows.map((r) => r.length))
      const len = new Array<number>(width).fill(0)
      rows.forEach((r) => r.forEach((c, i) => (len[i] += String(c ?? '').length)))
      textCols = [len.indexOf(Math.max(...len))]
      // Kopfzeile ohne bekannte Überschrift: erste Zeile überspringen, wenn sie deutlich kürzer als der Rest ist
      const col = textCols[0]
      const first = String(rows[0][col] ?? '').length
      const avg = (len[col] - first) / Math.max(1, rows.length - 1)
      if (rows.length > 1 && first <= 40 && first < avg / 2) headerIdx = 0
    }
    if (!textCols.length) continue

    for (const r of rows.slice(headerIdx + 1)) {
      const parts: string[] = []
      for (const ci of textCols) {
        const v = String(r[ci] ?? '').trim()
        if (v && !parts.includes(v)) parts.push(v)
      }
      if (!parts.length) continue
      out.push({
        text: parts.join(' – '),
        ref: refCol >= 0 ? String(r[refCol] ?? '').trim() || undefined : undefined,
        priority: prioCol >= 0 ? String(r[prioCol] ?? '').trim() || undefined : undefined,
      })
    }
  }
  return out
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function paragraphsFromXml(xml: string, para: RegExp, run: RegExp): string[] {
  const lines: string[] = []
  for (const p of xml.match(para) ?? []) {
    const text = [...p.matchAll(run)].map((m) => decodeXml(m[1])).join('')
    if (text.trim()) lines.push(text.trim())
  }
  return lines
}

async function pptxLines(file: File): Promise<string[]> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.replace(/\D+/g, '')) - parseInt(b.replace(/\D+/g, '')))
  const lines: string[] = []
  for (const n of slides) {
    const xml = await zip.files[n].async('string')
    lines.push(...paragraphsFromXml(xml, /<a:p[ >][\s\S]*?<\/a:p>/g, /<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
  }
  return lines
}

async function docxLines(file: File): Promise<string[]> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const xml = await zip.files['word/document.xml']?.async('string')
  if (!xml) throw new Error('Ungültige Word-Datei.')
  return paragraphsFromXml(xml, /<w:p[ >][\s\S]*?<\/w:p>/g, /<w:t[^>]*>([\s\S]*?)<\/w:t>/g)
}

async function pdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    const rows = new Map<number, { x: number; s: string }[]>()
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue
      const y = Math.round(it.transform[5])
      const row = rows.get(y) ?? []
      row.push({ x: it.transform[4], s: it.str })
      rows.set(y, row)
    }
    ;[...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, r]) => lines.push(r.sort((a, b) => a.x - b.x).map((c) => c.s).join(' ')))
  }
  return lines
}

const BULLET = /^\s*(?:[-•*▪●◦–·]|\d+[.)])\s+/
const REF_PREFIX = /^\s*((?:ANF|REQ|FA|NFA|LH|R|A|F)[-_ ]?\d+[\w.-]*|\d+(?:\.\d+)+)[\s:.)–-]+(.+)$/i
const MODAL = /\b(muss|müssen|soll|sollen|sollte|kann|können|benötigt|benötigen|wünsch|erforderlich|möglich|unterstütz|must|shall|should|need|require|support|able)/i

function mergeWrapped(lines: string[]): string[] {
  const out: string[] = []
  for (const raw of lines) {
    const l = raw.trim()
    if (!l) continue
    const prev = out[out.length - 1]
    if (prev && !/[.:;!?]$/.test(prev) && /^[a-zäöüß]/.test(l) && !BULLET.test(l)) out[out.length - 1] = `${prev} ${l}`
    else out.push(l)
  }
  return out
}

function fromLines(lines: string[]): RawRequirement[] {
  const cands: (RawRequirement & { strong: boolean })[] = []
  for (const line of mergeWrapped(lines)) {
    let text = line
    let ref: string | undefined
    const rm = REF_PREFIX.exec(text)
    if (rm) {
      ref = rm[1].trim()
      text = rm[2]
    }
    const bullet = BULLET.test(text)
    text = text.replace(BULLET, '').trim()
    const pieces = text.length > 280 ? text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/) : [text]
    for (const piece of pieces) {
      if (piece.length < 15 || piece.split(/\s+/).length < 3) continue
      cands.push({ ref: pieces.length === 1 ? ref : undefined, text: piece, strong: !!ref || bullet || MODAL.test(piece) })
    }
  }
  const strong = cands.filter((c) => c.strong)
  return (strong.length >= 3 ? strong : cands).map(({ ref, text }) => ({ ref, text }))
}

/* ───────────────────────── Matching ───────────────────────── */

const STOP = new Set(
  (
    'der die das den dem des ein eine einer einen einem eines und oder aber auch mit ohne fur von vom zum zur bei nach vor uber unter auf aus als wie wird werden wurde ist sind sein sei hat haben kann konnen muss mussen soll sollen sollte sich nicht nur noch sowie bzw ggf z b ca dass wenn dann es sie wir ihr ' +
      'the a an and or of to in on for with by from as is are be can must shall should will it its this that these those at not also etc system anforderung funktion funktionalitat moglich unterstutzen unterstutzung erforderlich bitte anbindung'
  ).split(' '),
)

const SUFFIXES = ['ungen', 'ung', 'keiten', 'keit', 'heiten', 'heit', 'lich', 'isch', 'ern', 'en', 'er', 'es', 'em', 'ing', 'ed', 'e', 's', 'n']

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function stem(w: string): string {
  for (const suf of SUFFIXES) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length)
  }
  return w
}

function tokenize(s: string): string[] {
  return fold(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP.has(w))
    .map(stem)
}

function sim(q: string, v: string): number {
  if (q === v) return 1
  if (q.length < 5 || v.length < 5) return 0
  const [s, l] = q.length < v.length ? [q, v] : [v, q]
  if (!l.includes(s)) return 0
  const ratio = (0.9 * s.length) / l.length
  return ratio >= 0.3 ? ratio : 0
}

export const FIT_THRESHOLD = 0.5
export const PARTIAL_THRESHOLD = 0.32
const MIN_SUGGESTION = 0.12
const MAX_TERMS = 4

interface StepDoc {
  processId: string
  areaIdx: number
  stepIdx: number
  label: string
}

export interface MatchIndex {
  docs: StepDoc[]
  postings: Map<string, [number, number][]>
  vocab: string[]
}

/** Baut den Suchindex über alle Pakete (Features) eines Prozesskatalogs (DE + EN). */
export function buildIndex(catalog: CatalogProcess[]): MatchIndex {
  const docs: StepDoc[] = []
  const weights: Map<string, number>[] = []
  for (const proc of catalog) {
    proc.areas.forEach((area, ai) => {
      area.steps.forEach((step, si) => {
        const w = new Map<string, number>()
        const add = (text: string | undefined, weight: number) => {
          for (const t of tokenize(text ?? '')) w.set(t, Math.max(w.get(t) ?? 0, weight))
        }
        add(step, 3)
        add(area.stepsEN?.[si], 3)
        add(area.stepModule?.[si], 2)
        add(area.t, 2)
        add(area.en, 2)
        area.bc.forEach((b) => add(b, 2))
        add(area.hint, 1)
        add(area.hintEN, 1)
        add(proc.nameDE, 1)
        add(proc.nameEN, 1)
        docs.push({ processId: proc.id, areaIdx: ai, stepIdx: si, label: `${proc.nameDE} › ${area.t} › ${step}` })
        weights.push(w)
      })
    })
  }
  const postings = new Map<string, [number, number][]>()
  weights.forEach((w, d) => w.forEach((weight, tok) => (postings.get(tok) ?? postings.set(tok, []).get(tok)!).push([d, weight])))
  return { docs, postings, vocab: [...postings.keys()] }
}

/** Liefert die besten MBPC-Pakete zu einem Anforderungstext (Score 0..1, absteigend). */
export function matchText(index: MatchIndex, text: string, limit = 3): RequirementMatch[] {
  const n = index.docs.length
  const queries = [...new Set(tokenize(text))].slice(0, 40)
  if (!queries.length || !n) return []
  const idf = (tok: string) => Math.log(1 + n / (index.postings.get(tok)?.length ?? 1))
  const unknownIdf = 0.5 * Math.log(1 + n)

  const scores = new Float64Array(n)
  const terms: { perDoc: Map<number, number>; best: number }[] = []
  for (const q of queries) {
    const perDoc = new Map<number, number>()
    let bestIdf = 0
    for (const v of index.vocab) {
      const s = sim(q, v)
      if (!s) continue
      const i = idf(v)
      bestIdf = Math.max(bestIdf, i)
      for (const [d, w] of index.postings.get(v)!) perDoc.set(d, Math.max(perDoc.get(d) ?? 0, s * w * i))
    }
    terms.push({ perDoc, best: bestIdf })
  }

  // Lange Sätze (z. B. Fragenkataloge): je Paket zählen nur die besten Treffer-Begriffe, sonst verwässert der Score
  if (!terms.some((x) => x.best > 0)) return []
  const maxByTerm = terms.map((x) => (x.best || unknownIdf) * 3).sort((a, b) => b - a)
  const denom = maxByTerm.slice(0, MAX_TERMS).reduce((a, b) => a + b, 0)
  const perDocVals = new Map<number, number[]>()
  for (const x of terms) {
    x.perDoc.forEach((val, d) => (perDocVals.get(d) ?? perDocVals.set(d, []).get(d)!).push(val))
  }
  perDocVals.forEach((vals, d) => {
    scores[d] = vals.sort((a, b) => b - a).slice(0, MAX_TERMS).reduce((a, b) => a + b, 0)
  })

  return [...scores.keys()]
    .map((d) => ({ d, score: scores[d] / denom }))
    .filter((x) => x.score >= MIN_SUGGESTION)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ d, score }) => ({
      processId: index.docs[d].processId,
      areaIdx: index.docs[d].areaIdx,
      stepIdx: index.docs[d].stepIdx,
      label: index.docs[d].label,
      score: Math.min(1, Math.round(score * 100) / 100),
    }))
}

export function coverageFor(score: number | undefined): Requirement['coverage'] {
  if (score === undefined) return 'gap'
  return score >= FIT_THRESHOLD ? 'fit' : score >= PARTIAL_THRESHOLD ? 'partial' : 'gap'
}

/** Erzeugt Requirement-Datensätze inkl. MBPC-Vorschlägen; bereits vorhandene Texte werden übersprungen. */
export function buildRequirements(
  raws: RawRequirement[],
  source: string,
  catalog: CatalogProcess[],
  existing: Requirement[],
): Requirement[] {
  const index = buildIndex(catalog)
  const known = new Set(existing.map((r) => r.text.toLowerCase()))
  const refs = new Set(existing.map((r) => r.ref))
  let seq = existing.length
  const out: Requirement[] = []
  for (const raw of raws) {
    if (known.has(raw.text.toLowerCase())) continue
    let ref = raw.ref
    if (!ref || refs.has(ref)) {
      do ref = `ANF-${String(++seq).padStart(3, '0')}`
      while (refs.has(ref))
    }
    refs.add(ref)
    const suggestions = matchText(index, raw.text)
    const coverage = coverageFor(suggestions[0]?.score)
    out.push({
      id: uid('req'),
      ref,
      text: raw.text,
      source,
      priority: raw.priority,
      coverage,
      suggestions,
      assigned: coverage === 'gap' ? undefined : suggestions[0],
      decision: 'pending',
    })
  }
  return out
}

/* ───────────────────────── Übernahme in den Scope ───────────────────────── */

const noteLine = (req: Requirement) => `[${req.ref}] ${req.text}`

/** Setzt das zugeordnete Feature in Scope und vermerkt die Anforderung (idempotent). */
export function applyRequirement(env: Environment, req: Requirement, catalog: CatalogProcess[]): boolean {
  const a = req.assigned
  if (!a) return false
  const key = featureKey(a.processId, a.areaIdx, a.stepIdx)
  const fs =
    env.scope.feature[key] ??
    (env.scope.feature[key] = {
      scope: 'unset',
      effort: { strategize: 0, initiate: 0, build: 0, prepare: 0, operate: 0 },
      products: [],
      standard: true,
    })
  if (fs.scope === 'unset' || fs.scope === 'out') {
    fs.scope = 'in'
    // Fit = Standard, Teilweise/Gap = Anpassung (fließt in das Register Entwicklung)
    fs.standard = req.coverage === 'fit'
  }
  if (isEffortEmpty(fs.effort)) {
    fs.effort = stepEffortFor(catalog, a.processId, a.areaIdx, a.stepIdx) ?? defaultFeatureEffort()
  }
  const line = noteLine(req)
  if (!(fs.note ?? '').includes(line)) fs.note = fs.note ? `${fs.note}\n${line}` : line
  req.decision = 'accepted'
  return true
}

/** Entfernt den Anforderungsvermerk vom Feature (Scope-Status bleibt bewusst unverändert). */
export function unapplyRequirement(env: Environment, req: Requirement): void {
  const a = req.assigned
  if (!a) return
  const fs = env.scope.feature[featureKey(a.processId, a.areaIdx, a.stepIdx)]
  if (!fs?.note) return
  fs.note = fs.note
    .split('\n')
    .filter((l) => !l.startsWith(`[${req.ref}] `))
    .join('\n')
}

/** Alle Pakete eines Katalogs für die manuelle Zuordnung (Auswahlliste). */
export function listPackages(
  catalog: CatalogProcess[],
  lang: 'de' | 'en',
): { value: string; label: string; group: string; match: Omit<RequirementMatch, 'score'> }[] {
  const out: { value: string; label: string; group: string; match: Omit<RequirementMatch, 'score'> }[] = []
  for (const p of catalog) {
    p.areas.forEach((a, ai) =>
      a.steps.forEach((s, si) => {
        const pn = lang === 'de' ? p.nameDE : p.nameEN
        const an = lang === 'de' ? a.t : a.en
        const sn = lang === 'de' ? s : a.stepsEN?.[si] || s
        out.push({
          value: featureKey(p.id, ai, si),
          label: `${an} › ${sn}`,
          group: pn,
          match: { processId: p.id, areaIdx: ai, stepIdx: si, label: `${p.nameDE} › ${a.t} › ${s}` },
        })
      }),
    )
  }
  return out
}
