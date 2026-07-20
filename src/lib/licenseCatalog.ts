import type { LicenseCatalog, LicenseCatalogItem } from '../types'

const CATALOG_KEY = 'cc-license-catalog-v1'

/** Erwartete Spaltenüberschriften der Preisliste (Active products – Report to CCB) */
const COL = {
  description: 'Description',
  code: 'Product number (code)',
  productType: 'Product Type',
  chargeType: 'Charge Type',
  priceGroup: 'Prod. Price Group',
  fullDescription: 'Full Description',
  unit: 'Default Unit',
  price: 'Price (€)',
} as const

function normHeader(h: unknown): string {
  return String(h ?? '').trim()
}

/** Kurzen Herstellernamen aus Preisgruppe / Produkttyp / Beschreibung ableiten */
function deriveVendor(priceGroup: string, productType: string, description: string): string {
  const fromGroup = priceGroup.split('-').slice(1).join('-').trim()
  if (fromGroup) return fromGroup
  const fromType = productType.split('-').slice(1).join('-').trim()
  if (fromType) return fromType
  const prefix = description.split('-')[0].trim()
  return prefix || 'Sonstige'
}

/** Monatspreis normalisieren (Annual → /12) */
function toMonthly(price: number, unit: string): number {
  const u = unit.toLowerCase()
  if (u.startsWith('annual') || u.startsWith('year') || u.startsWith('jahr')) return price / 12
  return price
}

/**
 * COSMO-Asset erkennen (COSMO-App/-Produkt).
 * COSMO-Produkte sind über Cosmo Parrot / Cosma in COSMO CONSULT auffindbar und
 * liegen in der Preisliste u. a. in den Preisgruppen „EMEA COSMO" / „Global COSMO (managed)".
 */
function isCosmoAsset(priceGroup: string, vendor: string, description: string, code: string): boolean {
  const hay = `${priceGroup} ${vendor} ${description} ${code}`.toLowerCase()
  return hay.includes('cosmo') || hay.includes('cosma')
}

/**
 * SaaS-Bezug einer Lizenz bestimmen.
 * SaaS = wiederkehrendes Cloud-/Subscription-Angebot (New Commerce, O365/D365 online,
 * Prepaid-/Pay-per-use-Abrechnung). On-Premises/perpetuelle „One Time"-Lizenzen sind KEIN SaaS.
 * COSMO-Assets werden immer als auswählbar berücksichtigt.
 */
function isSaaSRelated(
  chargeType: string,
  priceGroup: string,
  description: string,
  unit: string,
  cosmo: boolean,
): boolean {
  const pg = priceGroup.toLowerCase()
  const ct = chargeType.toLowerCase()
  const desc = description.toLowerCase()
  const u = unit.toLowerCase()

  // On-Premises / perpetuell explizit ausschließen
  if (pg.includes('on-premises') || pg.includes('on premise') || pg.includes('on-prem')) return false
  if (desc.includes('on-premises') || desc.includes('perpetual')) return false

  // COSMO-Assets immer berücksichtigen (Auswahlkriterium)
  if (cosmo) return true

  // Eindeutige SaaS-/Cloud-Indikatoren
  if (
    pg.includes('new commerce') ||
    pg.includes('o365') ||
    pg.includes('d365') ||
    pg.includes('online') ||
    pg.includes('saas') ||
    pg.includes('csp')
  )
    return true
  if (
    desc.includes('saas') ||
    desc.includes('online') ||
    desc.includes('cloud') ||
    desc.includes('new commerce') ||
    desc.includes('subscription')
  )
    return true

  // Wiederkehrende Abrechnung (Abo) = SaaS-Bezug; „One Time" (perpetuell) nicht
  if (ct.includes('one time') || ct.includes('one-time') || ct.includes('perpetual')) return false
  if (
    ct.includes('prepaid') ||
    ct.includes('pay-per-use') ||
    ct.includes('subscription') ||
    ct.includes('recurring') ||
    ct.includes('monthly') ||
    ct.includes('annual') ||
    u.startsWith('month') ||
    u.startsWith('annual')
  )
    return true

  return false
}

/** Parst eine hochgeladene .xls/.xlsx-Preisliste in einen Lizenzkatalog (nur SaaS + COSMO-Assets). */
export async function parseLicenseWorkbook(file: File): Promise<LicenseCatalog> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const items: LicenseCatalogItem[] = []
  let scannedCount = 0
  for (const row of rows) {
    // Header-Keys robust matchen (Trim)
    const get = (key: string): unknown => {
      const found = Object.keys(row).find((k) => normHeader(k) === key)
      return found ? row[found] : ''
    }
    const description = String(get(COL.description) || '').trim()
    const price = Number(get(COL.price)) || 0
    if (!description) continue
    scannedCount++

    const code = String(get(COL.code) || '').trim()
    const priceGroup = String(get(COL.priceGroup) || '').trim()
    const productType = String(get(COL.productType) || '').trim()
    const chargeType = String(get(COL.chargeType) || '').trim()
    const unit = String(get(COL.unit) || '').trim() || 'Month'

    const cosmo = isCosmoAsset(priceGroup, deriveVendor(priceGroup, productType, description), description, code)

    // SaaS-Filter: nur Lizenzen mit SaaS-Bezug (plus COSMO-Assets) einlesen
    if (!isSaaSRelated(chargeType, priceGroup, description, unit, cosmo)) continue

    items.push({
      code,
      description,
      vendor: deriveVendor(priceGroup, productType, description),
      chargeType,
      unit,
      price,
      monthlyPrice: toMonthly(price, unit),
      priceGroup,
      cosmo,
    })
  }

  return {
    items,
    importedAt: new Date().toISOString(),
    fileName: file.name,
    scannedCount,
  }
}

export function saveCatalog(catalog: LicenseCatalog): void {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog))
  } catch {
    /* Speicher voll / nicht verfügbar */
  }
}

export function loadCatalog(): LicenseCatalog | null {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    if (raw) return JSON.parse(raw) as LicenseCatalog
  } catch {
    /* ignore */
  }
  return null
}

export function clearCatalog(): void {
  try {
    localStorage.removeItem(CATALOG_KEY)
  } catch {
    /* ignore */
  }
}

/** Volltextsuche im Katalog (Beschreibung, Code, Hersteller). */
export function searchCatalog(
  catalog: LicenseCatalog | null,
  query: string,
  limit = 40,
  opts: { cosmoOnly?: boolean } = {},
): LicenseCatalogItem[] {
  if (!catalog) return []
  const pool = opts.cosmoOnly ? catalog.items.filter((i) => i.cosmo) : catalog.items
  const q = query.trim().toLowerCase()
  if (!q) return pool.slice(0, limit)
  const terms = q.split(/\s+/).filter(Boolean)
  const out: LicenseCatalogItem[] = []
  for (const item of pool) {
    const hay = `${item.description} ${item.code} ${item.vendor}`.toLowerCase()
    if (terms.every((t) => hay.includes(t))) {
      out.push(item)
      if (out.length >= limit) break
    }
  }
  return out
}

/** Anzahl der COSMO-Assets im Katalog. */
export function cosmoAssetCount(catalog: LicenseCatalog | null): number {
  if (!catalog) return 0
  return catalog.items.reduce((n, i) => n + (i.cosmo ? 1 : 0), 0)
}
