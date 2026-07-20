import { archetypeById, findIndustry, GROUP_LABEL, processById } from '../data/catalog'
import { calculate } from './calc'
import { catalogsForState } from './mbpcCatalog'
import type { Lang, ProjectState } from '../types'
import { PHASE_KEYS } from '../types'
import type { VersionMeta } from './library'

/**
 * Power-BI-Datenmodell (Sternschema) als Multi-Sheet-Excel-Datei.
 *
 * In Power BI Desktop öffnen über: Start › Daten abrufen › Excel-Arbeitsmappe.
 * Alle Faktentabellen sind über den Schlüssel `EnvironmentId` mit der
 * Dimension `Environments` verknüpfbar. Zahlen sind als echte Zahlen exportiert,
 * damit Power BI sie aggregieren kann.
 */
export async function exportPowerBiWorkbook(
  state: ProjectState,
  lang: Lang = 'de',
): Promise<void> {
  const XLSX = await import('xlsx')
  const calc = calculate(state)
  const cur = state.parameters.currency
  const period = calc.periodMonths

  // Prozess-Namensauflösung (MBPC + Standard-Katalog)
  const procList = catalogsForState(state)
  const procMap = new Map(procList.map((p) => [p.id, p]))
  const procName = (id: string): string => {
    const p = procMap.get(id) || processById(id)
    if (!p) return id
    return (lang === 'de' ? p.nameDE : p.nameEN) || p.nameDE || p.nameEN || id
  }
  const procGroup = (id: string): string => {
    const p = procMap.get(id) || processById(id)
    return p ? GROUP_LABEL[p.group][lang] : ''
  }
  const areaName = (processId: string, areaIdx: number): string => {
    const p = procMap.get(processId) || processById(processId)
    const a = p?.areas?.[areaIdx]
    if (!a) return ''
    return (lang === 'de' ? a.t : a.en) || a.t || ''
  }

  const phaseLabel = (k: string): string => {
    const de: Record<string, string> = {
      strategize: 'Strategize', initiate: 'Initiate', build: 'Build', prepare: 'Prepare', operate: 'Operate',
    }
    return de[k] || k
  }

  // ── Sheet: KPIs (Key/Value) ────────────────────────────────────────────
  const kpis: Array<{ Kennzahl: string; Wert: number; Einheit: string }> = [
    { Kennzahl: 'Gesamtinvestition (Zeitraum)', Wert: round(calc.totalPeriod), Einheit: cur },
    { Kennzahl: 'Dienstleistung einmalig', Wert: round(calc.serviceCostOneTime), Einheit: cur },
    { Kennzahl: 'Dienstleistung Aufwand', Wert: round(calc.serviceDays), Einheit: 'PT' },
    { Kennzahl: 'Feature-Aufwand', Wert: round(calc.featureDays), Einheit: 'PT' },
    { Kennzahl: 'Projekt-Overhead', Wert: round(calc.overheadDays), Einheit: 'PT' },
    { Kennzahl: 'Overhead-Kosten', Wert: round(calc.overheadCost), Einheit: cur },
    { Kennzahl: 'Lizenzen pro Monat', Wert: round(calc.licenseMonthly), Einheit: cur },
    { Kennzahl: 'Lizenzen pro Jahr', Wert: round(calc.licenseYearly), Einheit: cur },
    { Kennzahl: 'Lizenzen Zeitraum', Wert: round(calc.licensePeriod), Einheit: cur },
    { Kennzahl: 'Betrachtungszeitraum', Wert: period, Einheit: 'Monate' },
    { Kennzahl: 'Environments', Wert: state.environments.length, Einheit: 'Anzahl' },
    { Kennzahl: 'Länder', Wert: calc.distinctCountries, Einheit: 'Anzahl' },
    { Kennzahl: 'Features in Scope', Wert: calc.scopeStats.in, Einheit: 'Anzahl' },
    { Kennzahl: 'Features optional', Wert: calc.scopeStats.opt, Einheit: 'Anzahl' },
    { Kennzahl: 'Features out of Scope', Wert: calc.scopeStats.out, Einheit: 'Anzahl' },
    { Kennzahl: 'Standard-Features (Fit)', Wert: calc.standardCount, Einheit: 'Anzahl' },
    { Kennzahl: 'Customizing (Gap)', Wert: calc.customCount, Einheit: 'Anzahl' },
    {
      Kennzahl: 'Standard-Fit',
      Wert: calc.standardCount + calc.customCount > 0
        ? round((calc.standardCount / (calc.standardCount + calc.customCount)) * 100, 1)
        : 0,
      Einheit: '%',
    },
  ]

  // ── Sheet: Interessent (Stammdaten) ────────────────────────────────────
  const p = state.prospect
  const interessent: Array<{ Feld: string; Wert: string }> = [
    { Feld: 'Unternehmen', Wert: p.company },
    { Feld: 'Ansprechpartner', Wert: p.contact },
    { Feld: 'Branche', Wert: findIndustry(p.industryId, state.parameters.customIndustries)?.label || p.industryId },
    { Feld: 'Branchenmodell', Wert: archetypeById(p.archetypeId).label },
    { Feld: 'Unternehmensgröße', Wert: p.size },
    { Feld: 'Land', Wert: p.country },
    { Feld: 'Projektstart', Wert: p.projectStart },
    { Feld: 'Go-Live', Wert: p.goLive },
    { Feld: 'Währung', Wert: cur },
    { Feld: 'Betrachtungszeitraum (Monate)', Wert: String(period) },
    { Feld: 'Notizen', Wert: p.notes },
  ]

  // ── Sheet: Environments (Dimension + Kennzahlen) ───────────────────────
  const environments = calc.perEnvironment.map((e) => ({
    EnvironmentId: e.id,
    Environment: e.name,
    Land: e.country,
    Anwender: e.users,
    'Aufwand PT': round(e.serviceDays),
    'Dienstleistung einmalig': round(e.serviceCostOneTime),
    'Lizenz/Monat': round(e.licenseMonthly),
    'Lizenz/Jahr': round(e.licenseYearly),
    'Lizenz Zeitraum': round(e.licensePeriod),
    'Gesamt Zeitraum': round(e.totalPeriod),
    'Features in Scope': e.scope.scopeStats.in,
    'Features optional': e.scope.scopeStats.opt,
    'Features out': e.scope.scopeStats.out,
  }))

  // ── Sheet: Prozesse (Feature-Fakten je Environment) ────────────────────
  const prozesse: Array<Record<string, string | number>> = []
  for (const e of calc.perEnvironment) {
    for (const f of e.scope.features) {
      const row: Record<string, string | number> = {
        EnvironmentId: e.id,
        Environment: e.name,
        Land: e.country,
        ProzessId: f.processId,
        Prozess: procName(f.processId),
        Prozessgruppe: procGroup(f.processId),
        Bereich: areaName(f.processId, f.areaIdx),
        Feature: f.label,
        Scope: f.scope,
        Typ: f.standard ? 'Standard' : 'Customizing',
        'Aufwand PT': round(f.days),
        Kosten: round(f.cost),
      }
      for (const k of PHASE_KEYS) row[phaseLabel(k)] = round(f.phaseDays[k])
      prozesse.push(row)
    }
  }

  // ── Sheet: Phasen (Fakten je Environment) ──────────────────────────────
  const phasen: Array<Record<string, string | number>> = []
  for (const e of calc.perEnvironment) {
    for (const k of PHASE_KEYS) {
      phasen.push({
        EnvironmentId: e.id,
        Environment: e.name,
        Phase: phaseLabel(k),
        'Aufwand PT': round(e.scope.phaseDays[k]),
        Kosten: round(e.scope.phaseCost[k]),
      })
    }
  }

  // ── Sheet: Lizenzen (Fakten je Environment) ────────────────────────────
  const lizenzen: Array<Record<string, string | number>> = []
  for (const e of state.environments) {
    for (const l of e.licenses) {
      const monthly = (l.unitPriceMonthly || 0) * (l.quantity || 0)
      lizenzen.push({
        EnvironmentId: e.id,
        Environment: e.name,
        Produkt: l.product,
        Code: l.code || '',
        Menge: l.quantity || 0,
        'Preis/Einheit/Monat': round(l.unitPriceMonthly || 0),
        'Kosten/Monat': round(monthly),
        'Kosten/Jahr': round(monthly * 12),
        'Kosten Zeitraum': round(monthly * period),
      })
    }
  }

  // ── Sheet: Overhead ────────────────────────────────────────────────────
  const overhead = calc.overheadLines.map((o) => ({
    Position: o.name,
    'Aufwand PT': round(o.days),
    Kosten: round(o.cost),
    Angewendet: o.applied ? 'Ja' : 'Nein',
    Hinweis: o.reason || '',
  }))

  // ── Sheet: Scope (Verteilung je Environment) ───────────────────────────
  const scope = calc.perEnvironment.map((e) => ({
    EnvironmentId: e.id,
    Environment: e.name,
    'In Scope': e.scope.scopeStats.in,
    Optional: e.scope.scopeStats.opt,
    'Out of Scope': e.scope.scopeStats.out,
    Offen: e.scope.scopeStats.unset,
    Gesamt: e.scope.scopeStats.total,
  }))
  scope.push({
    EnvironmentId: 'GESAMT',
    Environment: 'Gesamt',
    'In Scope': calc.scopeStats.in,
    Optional: calc.scopeStats.opt,
    'Out of Scope': calc.scopeStats.out,
    Offen: calc.scopeStats.unset,
    Gesamt: calc.scopeStats.total,
  })

  // ── Workbook zusammenstellen ───────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  const add = (name: string, rows: unknown[]) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Hinweis: 'keine Daten' }])
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  add('KPIs', kpis)
  add('Interessent', interessent)
  add('Environments', environments)
  add('Prozesse', prozesse)
  add('Phasen', phasen)
  add('Lizenzen', lizenzen)
  add('Overhead', overhead)
  add('Scope', scope)

  const safe = (p.company || 'Interessent').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim() || 'Interessent'
  XLSX.writeFile(wb, `${safe} — Power BI Datenmodell.xlsx`)
}

/** Versionsvergleich als eigenständige Excel-Datei (optional aus dem Dashboard). */
export async function exportVersionComparison(
  company: string,
  versions: VersionMeta[],
): Promise<void> {
  const XLSX = await import('xlsx')
  const rows = versions.map((v) => ({
    Version: v.label,
    Datum: new Date(v.createdAt).toLocaleString('de-DE'),
    'Aufwand PT': round(v.kpis.serviceDays),
    'Dienstleistung': round(v.kpis.serviceCost),
    'Lizenz/Monat': round(v.kpis.licenseMonthly),
    'Gesamt Zeitraum': round(v.kpis.totalPeriod),
    'Features in Scope': v.kpis.inScope,
    Notiz: v.note,
  }))
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Hinweis: 'keine Versionen' }])
  XLSX.utils.book_append_sheet(wb, ws, 'Versionen')
  const safe = (company || 'Interessent').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim() || 'Interessent'
  XLSX.writeFile(wb, `${safe} — Versionsvergleich.xlsx`)
}

function round(v: number, digits = 2): number {
  const f = Math.pow(10, digits)
  return Math.round((v || 0) * f) / f
}
