// Generiert src/data/cosmoStandard.json aus der COSMO-MBPC-Excel-Vorlage.
// Einmalig zur Erzeugung des gebündelten Standard-Katalogs; die Laufzeit-Import-
// Logik in src/lib/cosmoMbpc.ts bildet dieselbe Zuordnung ab.
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const XLSX = createRequire(import.meta.url)('xlsx')

const SRC =
  process.argv[2] ??
  '/Users/mguec9382/Downloads/MBPC/BC Import Template - Microsoft Business Process Catalog Simple May 2025 – DE - MVP (mit Produktzuordnung) (2).xlsx'

const wb = XLSX.readFile(SRC)
const ws = wb.Sheets['MBPC']
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })

// Header-Zeile finden (enthält "Paket (Ebene 2,5)")
let hi = 0
for (let i = 0; i < rows.length; i++) {
  if (rows[i].some((c) => String(c).trim() === 'Paket (Ebene 2,5)')) {
    hi = i
    break
  }
}
const header = rows[hi].map((c) => String(c).trim())
const col = (name) => header.findIndex((h) => h === name)

const C = {
  type: 0,
  e1: col('Ebene 1') >= 0 ? col('Ebene 1') : 1,
  e2: col('Ebene 2') >= 0 ? col('Ebene 2') : 2,
  paket: col('Paket (Ebene 2,5)'),
  modul: col('Modul (Lizenzierung)'),
  is: col('I&S Summe'),
  bi: col('B&I Summe'),
  prep: col('Prepare Aufwände in LT'),
  op: col('Operate Aufwände in LT'),
}
// Ebene 1/2 Header haben ein Trailing-Space in manchen Exports
if (C.e1 < 0) C.e1 = header.findIndex((h) => h.startsWith('Ebene 1'))
if (C.e2 < 0) C.e2 = header.findIndex((h) => h.startsWith('Ebene 2') && !h.includes('2,5'))

const num = (v) => {
  if (v === '' || v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const ICONS = {
  10: '🏭', 20: '🛟', 30: '💡', 40: '⚙️', 50: '📈', 55: '👥', 60: '📦', 65: '💰',
  70: '🏭', 75: '🛒', 80: '📊', 85: '🎯', 90: '📒', 95: '🔧', 99: '🛡️',
}
const GROUP = { 50: 'manage', 55: 'support', 90: 'support', 99: 'support' }

// Prozesse/Bereiche/Pakete aufbauen (Reihenfolge-stabil, Carry-Forward)
const procMap = new Map()
let curE1 = ''
let curE2 = ''

for (let i = hi + 1; i < rows.length; i++) {
  const r = rows[i]
  const type = String(r[C.type] ?? '').trim()
  const e1 = String(r[C.e1] ?? '').trim()
  const e2 = String(r[C.e2] ?? '').trim()
  const paket = String(r[C.paket] ?? '').trim()
  if (e1) curE1 = e1
  if (e2) curE2 = e2
  if (e2 && !paket) curE2 = e2 // Bereichs-Header

  if (!curE1) continue
  // Prozess sicherstellen
  if (!procMap.has(curE1)) {
    const numPrefix = parseInt(String(curE1).match(/^\d+/)?.[0] ?? '0', 10)
    procMap.set(curE1, {
      id: slug(curE1),
      catId: numPrefix || 'MBPC',
      icon: ICONS[numPrefix] || '🔷',
      group: GROUP[numPrefix] || 'primary',
      nameDE: curE1,
      nameEN: curE1,
      intro: `Microsoft Business Process Catalog · End-to-End-Prozess „${curE1}“.`,
      introEN: `Microsoft Business Process Catalog · end-to-end process “${curE1}”.`,
      cosmo: true,
      _areas: new Map(),
    })
  }
  const proc = procMap.get(curE1)
  if (!curE2) continue
  if (!proc._areas.has(curE2)) {
    proc._areas.set(curE2, {
      t: curE2,
      en: curE2,
      hint: '',
      hintEN: '',
      bc: [],
      steps: [],
      stepsEN: [],
      stepModule: [],
      stepEffort: [],
    })
  }
  // Nur echte Paket-Zeilen werden zu Scope-Features
  const isPaket = type.toLowerCase() === 'paket' || (paket && type.toLowerCase() !== 'epic')
  if (!paket || !isPaket) continue

  const area = proc._areas.get(curE2)
  const modul = String(r[C.modul] ?? '').replace(/"/g, '').trim()
  const effort = {
    strategize: 0,
    initiate: num(r[C.is]),
    build: num(r[C.bi]),
    prepare: num(r[C.prep]),
    operate: num(r[C.op]),
  }
  area.steps.push(paket)
  area.stepsEN.push(paket)
  area.stepModule.push(modul)
  area.stepEffort.push(effort)
}

const out = [...procMap.values()].map((p) => ({
  id: p.id,
  catId: p.catId,
  icon: p.icon,
  group: p.group,
  nameDE: p.nameDE,
  nameEN: p.nameEN,
  intro: p.intro,
  introEN: p.introEN,
  cosmo: p.cosmo,
  areas: [...p._areas.values()].filter((a) => a.steps.length > 0),
})).filter((p) => p.areas.length > 0)

const dest = new URL('../src/data/cosmoStandard.json', import.meta.url)
writeFileSync(dest, JSON.stringify(out, null, 1))

const packages = out.reduce((s, p) => s + p.areas.reduce((x, a) => x + a.steps.length, 0), 0)
const withMod = out.reduce(
  (s, p) => s + p.areas.reduce((x, a) => x + a.stepModule.filter(Boolean).length, 0),
  0,
)
console.log(`Prozesse: ${out.length}`)
console.log(`Bereiche: ${out.reduce((s, p) => s + p.areas.length, 0)}`)
console.log(`Pakete:   ${packages} (mit Modul: ${withMod})`)
console.log('Beispiel-Prozesse:', out.map((p) => `${p.catId} ${p.nameDE} (${p.areas.length}B)`).slice(0, 5).join(' | '))
const sampleArea = out[0].areas[0]
console.log('Beispiel-Paket:', sampleArea.steps[0], '| Modul:', JSON.stringify(sampleArea.stepModule[0]), '| Aufwand:', JSON.stringify(sampleArea.stepEffort[0]))
// Beispiel mit Modul
for (const p of out) {
  for (const a of p.areas) {
    const idx = a.stepModule.findIndex(Boolean)
    if (idx >= 0) {
      console.log('Beispiel mit Modul:', a.steps[idx], '=>', JSON.stringify(a.stepModule[idx]))
      break
    }
  }
  if (out.indexOf(p) > 2) break
}
