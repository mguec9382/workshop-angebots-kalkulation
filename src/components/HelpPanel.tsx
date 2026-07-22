import { useEffect, useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import type { Lang } from '../types'

/* ═══════════════════════════════════════════════════════════════════════
   Online-Hilfe & Handbuch (Drehbuch: Interessent → Angebot)
   – In-App-Overlay, zusätzlich als PDF druckbar.
   ═══════════════════════════════════════════════════════════════════════ */

type L = { de: string; en: string }
const tx = (l: L, lang: Lang) => (lang === 'de' ? l.de : l.en)

interface Step {
  n: number
  icon: string
  tab: L
  goal: L
  action: L
  result: L
  tip?: L
}

interface RefItem {
  icon: string
  title: L
  text: L
}

/* ---------- Drehbuch: Schritt für Schritt bis zum Angebot ---------- */
const STEPS: Step[] = [
  {
    n: 1,
    icon: '🏢',
    tab: { de: 'Interessent anlegen', en: 'Create prospect' },
    goal: { de: 'Stammdaten des Kunden erfassen und den Start-Scope festlegen.', en: 'Capture the customer master data and define the initial scope.' },
    action: {
      de: 'Register „Interessent" öffnen › Unternehmen, Ansprechpartner, Land, Größe, Termine eingeben › Branche wählen (der passende Archetyp wird automatisch gesetzt) › „🗺️ Scope-Preset anwenden" klicken.',
      en: 'Open the "Prospect" tab › enter company, contact, country, size, dates › select industry (the matching archetype is set automatically) › click "🗺️ Apply scope preset".',
    },
    result: { de: 'Der Grund-Scope der aktiven Umgebung ist anhand von Archetyp und Branchen-Overlay vorbelegt.', en: 'The base scope of the active environment is pre-populated from archetype and industry overlay.' },
    tip: { de: 'Fehlt eine Branche? Unter „Parameter › Branchen" neue Branchen anlegen und einem Archetyp zuordnen.', en: 'Missing an industry? Add new industries under "Parameters › Industries" and assign an archetype.' },
  },
  {
    n: 2,
    icon: '🗂️',
    tab: { de: 'Environments & Mandanten', en: 'Environments & tenants' },
    goal: { de: 'Systemlandschaft, Länder, Benutzer und Lizenzen definieren.', en: 'Define the system landscape, countries, users and licenses.' },
    action: {
      de: 'Register „Environments" › Umgebungen anlegen (Prod/Test/Dev) › Land, Währung, Benutzerzahl setzen › Mandanten je Umgebung ergänzen › Lizenzen zuordnen.',
      en: 'Open "Environments" › create environments (prod/test/dev) › set country, currency, user count › add tenants per environment › assign licenses.',
    },
    result: { de: 'Jede Umgebung hat einen eigenen Workshop-Scope und eine eigene Lizenzaufstellung.', en: 'Each environment has its own workshop scope and license breakdown.' },
    tip: { de: 'Länderübergreifende Projekte aktivieren automatisch den länderübergreifenden Overhead (Parameter).', en: 'Cross-country projects automatically enable cross-country overhead (parameters).' },
  },
  {
    n: 3,
    icon: '⚙️',
    tab: { de: 'Parameter einrichten', en: 'Set up parameters' },
    goal: { de: 'Kalkulationsgrundlagen einmalig festlegen (Standardwerte vorhanden).', en: 'Define the calculation basis once (defaults are provided).' },
    action: {
      de: 'Register „Parameter" › Währung, Stunden/Tag, Einheit › Rollen & Tagessätze › Rolle je SbD-Phase › Overhead-Zuschläge › optional Branchen & Prozess-Overlays pflegen.',
      en: 'Open "Parameters" › currency, hours/day, unit › roles & day rates › role per SbD phase › overhead surcharges › optionally maintain industries & process overlays.',
    },
    result: { de: 'Tagessätze, Phasenrollen und Overhead fließen automatisch in die Kalkulation ein.', en: 'Day rates, phase roles and overhead automatically feed into the calculation.' },
  },
  {
    n: 4,
    icon: '📋',
    tab: { de: 'MBPC-Workshop durchführen', en: 'Run the MBPC workshop' },
    goal: { de: 'Den Projektumfang je Prozess, Bereich und Feature bewerten.', en: 'Assess the project scope per process, area and feature.' },
    action: {
      de: 'Register „MBPC-Workshop" › aktive Umgebung wählen › Prozesskacheln aufklappen › Scope je Feature setzen (In / Optional / Out) › Fit-Score je Prozess vergeben. Branchenrelevante Prozesse sind mit ⭐ markiert.',
      en: 'Open "MBPC Workshop" › choose the active environment › expand process tiles › set scope per feature (In / Optional / Out) › assign a fit score per process. Industry-relevant processes are marked with ⭐.',
    },
    result: { de: 'Ein sauber abgegrenzter Scope je Umgebung – Grundlage für Mapping und Kalkulation.', en: 'A cleanly delimited scope per environment – the basis for mapping and calculation.' },
    tip: { de: 'Der „Archetyp-Fokus" blendet irrelevante Prozesse aus; ⭐ zeigt branchenspezifische Betonungen.', en: 'The "archetype focus" fades out irrelevant processes; ⭐ shows industry-specific emphasis.' },
  },
  {
    n: 5,
    icon: '🧩',
    tab: { de: 'Produkt-Mapping', en: 'Product mapping' },
    goal: { de: 'In-Scope-Features den Produkten zuordnen und Fit/Gap bestimmen.', en: 'Map in-scope features to products and determine fit/gap.' },
    action: {
      de: 'Register „Produkt-Mapping" › je Feature Produkte wählen (Microsoft / COSMO / Third-Party) › „Standard" (Fit) oder „Customization" (Gap) markieren.',
      en: 'Open "Product Mapping" › select products per feature (Microsoft / COSMO / third-party) › mark as "standard" (fit) or "customization" (gap).',
    },
    result: { de: 'Transparente Fit-Gap-Analyse und Produktabdeckung des Scopes.', en: 'Transparent fit-gap analysis and product coverage of the scope.' },
  },
  {
    n: 6,
    icon: '💰',
    tab: { de: 'Kalkulation', en: 'Calculation' },
    goal: { de: 'Aufwand je In-Scope-Feature über die vier SbD-Phasen schätzen.', en: 'Estimate effort per in-scope feature across the four SbD phases.' },
    action: {
      de: 'Register „Kalkulation" › Aufwände je Feature und Phase (Initiate, Build, Prepare, Operate) in Tagen/Stunden erfassen oder Standardvorlage übernehmen.',
      en: 'Open "Calculation" › capture effort per feature and phase (Initiate, Build, Prepare, Operate) in days/hours or use the default template.',
    },
    result: { de: 'Aufwand × Tagessatz + Overhead ergeben die Dienstleistungskosten (Live in der Seitenleiste).', en: 'Effort × day rate + overhead yields the service cost (live in the sidebar).' },
    tip: { de: 'Beim Aufnehmen eines Features wird automatisch eine Standard-Aufwandsvorlage (3,0 PT) gesetzt.', en: 'When a feature is added, a default effort template (3.0 person-days) is applied automatically.' },
  },
  {
    n: 7,
    icon: '📊',
    tab: { de: 'Management Summary prüfen', en: 'Review the management summary' },
    goal: { de: 'Ergebnis verdichten: Fit/Gap, Kosten und Aufwand je Prozess.', en: 'Condense the result: fit/gap, cost and effort per process.' },
    action: { de: 'Register „Management Summary" › Kennzahlen, Fit-Scores und Kostenblöcke auf Plausibilität prüfen.', en: 'Open "Management Summary" › review KPIs, fit scores and cost blocks for plausibility.' },
    result: { de: 'Entscheidungsreife Übersicht für die interne Freigabe.', en: 'A decision-ready overview for internal sign-off.' },
  },
  {
    n: 8,
    icon: '📤',
    tab: { de: 'Angebot erzeugen', en: 'Generate the quote' },
    goal: { de: 'Das Angebot dokumentieren, sichern und ausgeben.', en: 'Document, save and output the quotation.' },
    action: {
      de: 'Dashboard (📈) für die Kundenpräsentation prüfen › unter „Versionen & Angebote" (🗃️) eine Angebotsversion speichern › Register „Export" (📤) › „🖨️ Als PDF drucken" oder JSON/Excel-Report exportieren.',
      en: 'Review the dashboard (📈) for the customer presentation › save a quote version under "Versions & quotes" (🗃️) › open "Export" (📤) › "🖨️ Print as PDF" or export JSON/Excel report.',
    },
    result: { de: 'Fertiges Angebot als PDF, versioniert und wiederherstellbar.', en: 'A finished quote as PDF, versioned and restorable.' },
    tip: { de: 'Für Kundentermine die „Kundenansicht" (👁️) im Header aktivieren – die interne Live-Kalkulation wird ausgeblendet.', en: 'For customer meetings, enable "customer view" (👁️) in the header – the internal live calculation is hidden.' },
  },
]

/* ---------- Register-Referenz ---------- */
const REGISTERS: RefItem[] = [
  { icon: '🏢', title: { de: 'Interessent', en: 'Prospect' }, text: { de: 'Kundenstammdaten, Branche & Archetyp, Scope-Preset.', en: 'Customer master data, industry & archetype, scope preset.' } },
  { icon: '🗂️', title: { de: 'Environments', en: 'Environments' }, text: { de: 'Umgebungen (Prod/Test/Dev), Mandanten, Länder, Benutzer, Lizenzen.', en: 'Environments (prod/test/dev), tenants, countries, users, licenses.' } },
  { icon: '📋', title: { de: 'MBPC-Workshop', en: 'MBPC Workshop' }, text: { de: 'End-to-End-Prozesse scopen (In/Optional/Out), Fit-Score, Branchen-⭐.', en: 'Scope end-to-end processes (In/Optional/Out), fit score, industry ⭐.' } },
  { icon: '🧩', title: { de: 'Produkt-Mapping', en: 'Product Mapping' }, text: { de: 'Features Produkten zuordnen, Standard vs. Customization (Fit/Gap).', en: 'Map features to products, standard vs. customization (fit/gap).' } },
  { icon: '💰', title: { de: 'Kalkulation', en: 'Calculation' }, text: { de: 'Aufwand je Feature über die fünf Success-by-Design-Phasen.', en: 'Effort per feature across the five Success by Design phases.' } },
  { icon: '⚙️', title: { de: 'Parameter', en: 'Parameters' }, text: { de: 'Währung, Rollen & Tagessätze, Phasenrollen, Overhead, Branchen & Overlays.', en: 'Currency, roles & day rates, phase roles, overhead, industries & overlays.' } },
  { icon: '📊', title: { de: 'Management Summary', en: 'Management Summary' }, text: { de: 'Verdichtete Entscheidungssicht: Fit/Gap, Kosten, Aufwand je Prozess.', en: 'Condensed decision view: fit/gap, cost, effort per process.' } },
  { icon: '📈', title: { de: 'Dashboard', en: 'Dashboard' }, text: { de: 'Interaktive KPIs, filterbar nach Environment/Land, Excel-Report-Export.', en: 'Interactive KPIs, filterable by environment/country, Excel report export.' } },
  { icon: '🗃️', title: { de: 'Versionen & Angebote', en: 'Versions & quotes' }, text: { de: 'Angebotsstände speichern, vergleichen und wiederherstellen.', en: 'Save, compare and restore quote states.' } },
  { icon: '📤', title: { de: 'Export', en: 'Export' }, text: { de: 'Druckbares Angebot (PDF), JSON-Export/Import, Excel-Report.', en: 'Printable quote (PDF), JSON export/import, Excel report.' } },
]

/* ---------- Glossar ---------- */
const GLOSSARY: { term: L; def: L }[] = [
  { term: { de: 'Archetyp', en: 'Archetype' }, def: { de: 'Branchenmodell, das den groben Prozess-Scope vorbelegt (z. B. Diskrete Fertigung, Handel).', en: 'Industry model that pre-populates the coarse process scope (e.g. discrete manufacturing, trade).' } },
  { term: { de: 'Scope-Preset', en: 'Scope preset' }, def: { de: 'Ein-Klick-Vorbelegung des Scopes anhand des Archetyps + Branchen-Overlays.', en: 'One-click pre-population of the scope based on the archetype + industry overlay.' } },
  { term: { de: 'Prozess-Overlay', en: 'Process overlay' }, def: { de: 'Branchenspezifische Betonung: zusätzliche relevante Prozesse (⭐), die in den Scope kommen.', en: 'Industry-specific emphasis: additional relevant processes (⭐) added to the scope.' } },
  { term: { de: 'MBPC', en: 'MBPC' }, def: { de: 'Microsoft Business Process Catalog – der End-to-End-Prozesskatalog als Workshop-Grundlage.', en: 'Microsoft Business Process Catalog – the end-to-end process catalog as the workshop basis.' } },
  { term: { de: 'SbD-Phasen', en: 'SbD phases' }, def: { de: 'Success by Design: Strategize, Initiate, Build, Prepare, Operate.', en: 'Success by Design: Strategize, Initiate, Build, Prepare, Operate.' } },
  { term: { de: 'Fit / Gap', en: 'Fit / gap' }, def: { de: '„Standard" = im Produkt abgedeckt (Fit), „Customization" = Anpassung nötig (Gap).', en: '"Standard" = covered by the product (fit), "customization" = adaptation needed (gap).' } },
  { term: { de: 'Overhead', en: 'Overhead' }, def: { de: 'Zuschläge für Projektleitung, Architektur etc. – prozentual oder in Tagen.', en: 'Surcharges for project management, architecture etc. – as a percentage or in days.' } },
  { term: { de: 'Environment / Mandant', en: 'Environment / tenant' }, def: { de: 'Umgebung (Prod/Test/Dev) mit eigenem Scope; Mandanten sind Buchungskreise darin.', en: 'Environment (prod/test/dev) with its own scope; tenants are legal entities within it.' } },
]

/* ---------- Tipps & FAQ ---------- */
const FAQ: { q: L; a: L }[] = [
  { q: { de: 'Wie speichere ich meinen Stand?', en: 'How do I save my work?' }, a: { de: 'Alles wird automatisch lokal gespeichert. Für benannte Stände „Versionen & Angebote" nutzen oder im Header als JSON exportieren.', en: 'Everything is saved locally automatically. Use "Versions & quotes" for named states or export as JSON in the header.' } },
  { q: { de: 'Wie starte ich schnell mit einem Beispiel?', en: 'How do I start quickly with an example?' }, a: { de: 'Im Header „★ Beispiel laden" – lädt ein vollständiges Pharma-Beispiel.', en: 'Click "★ Load example" in the header – loads a complete pharma example.' } },
  { q: { de: 'Wie zeige ich dem Kunden nur die relevanten Zahlen?', en: 'How do I show the customer only the relevant figures?' }, a: { de: 'Header › „👁️ Kundenansicht" blendet die interne Live-Kalkulation aus.', en: 'Header › "👁️ Customer view" hides the internal live calculation.' } },
  { q: { de: 'Kann ich mehrere Angebote parallel führen?', en: 'Can I manage several quotes in parallel?' }, a: { de: 'Ja – im Header über den Interessenten-Switcher (＋ neu, ⧉ duplizieren).', en: 'Yes – via the prospect switcher in the header (＋ new, ⧉ duplicate).' } },
  { q: { de: 'Sprache wechseln?', en: 'Switch language?' }, a: { de: 'Header oben rechts DE/EN – die gesamte Oberfläche inkl. Hilfe wechselt.', en: 'Top-right DE/EN in the header – the entire UI incl. help switches.' } },
]

const OVERVIEW: L = {
  de: 'Diese Plattform führt Sie strukturiert vom Erstkontakt (Interessent) bis zum fertigen Angebot. Sie kombiniert einen MBPC-Prozess-Workshop (Success by Design) mit einer transparenten Aufwands- und Kostenkalkulation. Arbeiten Sie die Register am besten in der nummerierten Reihenfolge ab – das folgende Drehbuch beschreibt jeden Schritt.',
  en: 'This platform guides you in a structured way from first contact (prospect) to the finished quote. It combines an MBPC process workshop (Success by Design) with a transparent effort and cost calculation. Work through the tabs in the numbered order – the screenplay below describes each step.',
}

const SECTIONS = [
  { id: 'overview', icon: '📖', title: { de: 'Überblick', en: 'Overview' } as L },
  { id: 'drehbuch', icon: '🎬', title: { de: 'Drehbuch: In 8 Schritten zum Angebot', en: 'Screenplay: 8 steps to the quote' } as L },
  { id: 'register', icon: '🗂️', title: { de: 'Register-Referenz', en: 'Tab reference' } as L },
  { id: 'glossar', icon: '📚', title: { de: 'Glossar', en: 'Glossary' } as L },
  { id: 'faq', icon: '💡', title: { de: 'Tipps & FAQ', en: 'Tips & FAQ' } as L },
]

export function HelpPanel({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLang()
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function goto(id: string) {
    setActive(id)
    document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto my-4 flex h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#141a24]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('help_title')}
      >
        {/* Kopfleiste */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-cosmo-anthracite px-5 py-3 text-white dark:border-slate-700">
          <span className="text-xl">❔</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{t('help_title')}</div>
            <div className="truncate text-xs text-white/60">{t('appTitle')}</div>
          </div>
          <button
            className="rounded-lg bg-cosmo-gold px-3 py-1.5 text-xs font-bold text-cosmo-anthracite hover:brightness-105"
            onClick={() => printHandbook(lang)}
          >
            🖨️ {t('help_print')}
          </button>
          <button
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-white/80 hover:bg-white/10"
            onClick={onClose}
            aria-label={t('help_close')}
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Inhaltsverzeichnis */}
          <nav className="hidden w-56 shrink-0 overflow-y-auto border-r border-slate-100 bg-slate-50/60 p-3 sm:block dark:border-slate-700 dark:bg-white/5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => goto(s.id)}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  active === s.id
                    ? 'bg-cosmo-gold/15 text-cosmo-anthracite dark:text-slate-100'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <span>{s.icon}</span>
                <span className="min-w-0 flex-1">{tx(s.title, lang)}</span>
              </button>
            ))}
          </nav>

          {/* Inhalt */}
          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
            {/* Überblick */}
            <section id="help-overview" className="mb-8 scroll-mt-4">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-cosmo-anthracite dark:text-slate-100">
                📖 {tx(SECTIONS[0].title, lang)}
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{tx(OVERVIEW, lang)}</p>
            </section>

            {/* Drehbuch */}
            <section id="help-drehbuch" className="mb-8 scroll-mt-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-cosmo-anthracite dark:text-slate-100">
                🎬 {tx(SECTIONS[1].title, lang)}
              </h2>
              <ol className="space-y-3">
                {STEPS.map((s) => (
                  <li key={s.n} className="rounded-xl border border-slate-100 p-4 dark:border-slate-700">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cosmo-gold text-sm font-bold text-cosmo-anthracite">
                        {s.n}
                      </span>
                      <span className="text-lg">{s.icon}</span>
                      <span className="font-bold text-cosmo-anthracite dark:text-slate-100">{tx(s.tab, lang)}</span>
                    </div>
                    <dl className="space-y-1 text-sm">
                      <Row k={lang === 'de' ? 'Ziel' : 'Goal'} v={tx(s.goal, lang)} />
                      <Row k={lang === 'de' ? 'Bedienung' : 'Action'} v={tx(s.action, lang)} />
                      <Row k={lang === 'de' ? 'Ergebnis' : 'Result'} v={tx(s.result, lang)} />
                      {s.tip && <Row k="Tipp" v={tx(s.tip, lang)} accent />}
                    </dl>
                  </li>
                ))}
              </ol>
            </section>

            {/* Register-Referenz */}
            <section id="help-register" className="mb-8 scroll-mt-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-cosmo-anthracite dark:text-slate-100">
                🗂️ {tx(SECTIONS[2].title, lang)}
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REGISTERS.map((r, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-700">
                    <span className="text-xl">{r.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{tx(r.title, lang)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{tx(r.text, lang)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Glossar */}
            <section id="help-glossar" className="mb-8 scroll-mt-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-cosmo-anthracite dark:text-slate-100">
                📚 {tx(SECTIONS[3].title, lang)}
              </h2>
              <dl className="space-y-2">
                {GLOSSARY.map((g, i) => (
                  <div key={i} className="text-sm">
                    <dt className="font-bold text-cosmo-anthracite dark:text-slate-100">{tx(g.term, lang)}</dt>
                    <dd className="text-slate-500 dark:text-slate-400">{tx(g.def, lang)}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* FAQ */}
            <section id="help-faq" className="mb-4 scroll-mt-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-cosmo-anthracite dark:text-slate-100">
                💡 {tx(SECTIONS[4].title, lang)}
              </h2>
              <div className="space-y-3">
                {FAQ.map((f, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
                    <div className="text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{tx(f.q, lang)}</div>
                    <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{tx(f.a, lang)}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className={`w-24 shrink-0 font-semibold ${accent ? 'text-cosmo-gold-dark' : 'text-slate-400'}`}>{k}</dt>
      <dd className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">{v}</dd>
    </div>
  )
}

/* ---------- Handbuch als druckbares PDF (eigenes Fenster) ---------- */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function printHandbook(lang: Lang) {
  const title = lang === 'de' ? 'Handbuch & Drehbuch' : 'Manual & Screenplay'
  const sub = lang === 'de' ? 'Workshop- & Angebots-Kalkulations-Plattform' : 'Workshop & Quotation Calculation Platform'
  const lbl = {
    goal: lang === 'de' ? 'Ziel' : 'Goal',
    action: lang === 'de' ? 'Bedienung' : 'Action',
    result: lang === 'de' ? 'Ergebnis' : 'Result',
    tip: lang === 'de' ? 'Tipp' : 'Tip',
    overview: lang === 'de' ? 'Überblick' : 'Overview',
    drehbuch: lang === 'de' ? 'Drehbuch: In 8 Schritten zum Angebot' : 'Screenplay: 8 steps to the quote',
    register: lang === 'de' ? 'Register-Referenz' : 'Tab reference',
    glossar: lang === 'de' ? 'Glossar' : 'Glossary',
    faq: lang === 'de' ? 'Tipps & FAQ' : 'Tips & FAQ',
  }

  const steps = STEPS.map(
    (s) => `
    <div class="step">
      <h3><span class="n">${s.n}</span> ${s.icon} ${esc(tx(s.tab, lang))}</h3>
      <p><b>${lbl.goal}:</b> ${esc(tx(s.goal, lang))}</p>
      <p><b>${lbl.action}:</b> ${esc(tx(s.action, lang))}</p>
      <p><b>${lbl.result}:</b> ${esc(tx(s.result, lang))}</p>
      ${s.tip ? `<p class="tip"><b>${lbl.tip}:</b> ${esc(tx(s.tip, lang))}</p>` : ''}
    </div>`,
  ).join('')

  const registers = REGISTERS.map(
    (r) => `<tr><td class="ic">${r.icon}</td><td><b>${esc(tx(r.title, lang))}</b></td><td>${esc(tx(r.text, lang))}</td></tr>`,
  ).join('')

  const glossary = GLOSSARY.map(
    (g) => `<tr><td><b>${esc(tx(g.term, lang))}</b></td><td>${esc(tx(g.def, lang))}</td></tr>`,
  ).join('')

  const faq = FAQ.map((f) => `<div class="faq"><p class="q">${esc(tx(f.q, lang))}</p><p>${esc(tx(f.a, lang))}</p></div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${esc(title)} · COSMO CONSULT</title>
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;700&display=swap" rel="stylesheet" />
<style>
  :root { --gold:#B39C4D; --anthracite:#1B212E; }
  * { box-sizing: border-box; }
  body { font-family: 'Quicksand', -apple-system, Segoe UI, sans-serif; color:#333; margin:0; padding:32px 40px; }
  h1 { color: var(--anthracite); font-size:26px; margin:0; }
  .sub { color:#888; font-size:13px; margin:2px 0 0; }
  .brand { display:flex; align-items:center; gap:14px; border-bottom:3px solid var(--gold); padding-bottom:14px; margin-bottom:22px; }
  .brand .mark { width:44px; height:44px; }
  h2 { color: var(--anthracite); font-size:17px; margin:26px 0 10px; border-left:4px solid var(--gold); padding-left:10px; }
  h3 { color: var(--anthracite); font-size:14px; margin:0 0 6px; }
  p { font-size:12.5px; line-height:1.55; margin:3px 0; }
  .step { border:1px solid #eee; border-radius:8px; padding:12px 14px; margin:10px 0; page-break-inside: avoid; }
  .step .n { display:inline-flex; width:20px; height:20px; align-items:center; justify-content:center; background:var(--gold); color:var(--anthracite); border-radius:50%; font-weight:700; font-size:12px; margin-right:4px; }
  .tip { color:#7a6a2e; }
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  td { border-bottom:1px solid #eee; padding:6px 8px; vertical-align:top; }
  td.ic { width:26px; }
  .faq { margin:8px 0; page-break-inside: avoid; }
  .faq .q { font-weight:700; color:var(--anthracite); margin-bottom:2px; }
  .foot { margin-top:28px; border-top:1px solid #eee; padding-top:8px; color:#aaa; font-size:11px; }
  @media print { body { padding:0; } h2 { page-break-after: avoid; } }
</style>
</head>
<body>
  <div class="brand">
    <svg class="mark" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="#B39C4D" d="m216.99,160.32l-66.09-96.72c-5.3-7.75-14.08-12.39-23.47-12.39s-18.17,4.64-23.47,12.39l-66.09,96.71c-5.95,8.7-6.59,19.98-1.67,29.3,4.92,9.32,14.6,15.16,25.14,15.16h132.18c10.54,0,20.22-5.83,25.14-15.16,4.92-9.32,4.28-20.6-1.67-29.3Zm-25.87-2.2c-2.03,8.26-8.46,14.72-16.71,16.78l-75.73,18.93c-8.25,2.06-16.97-.61-22.64-6.95-5.68-6.33-7.38-15.29-4.43-23.27l24.02-64.88c2.63-7.1,8.6-12.45,15.95-14.29,7.35-1.84,15.13.07,20.8,5.11l51.72,45.95c6.36,5.65,9.07,14.35,7.04,22.61Z"/><circle fill="#B39C4D" cx="212.4" cy="80.01" r="19.2"/></svg>
    <div><h1>${esc(title)}</h1><p class="sub">${esc(sub)} · COSMO CONSULT</p></div>
  </div>

  <h2>${lbl.overview}</h2>
  <p>${esc(tx(OVERVIEW, lang))}</p>

  <h2>${lbl.drehbuch}</h2>
  ${steps}

  <h2>${lbl.register}</h2>
  <table>${registers}</table>

  <h2>${lbl.glossar}</h2>
  <table>${glossary}</table>

  <h2>${lbl.faq}</h2>
  ${faq}

  <div class="foot">© ${new Date().getFullYear()} COSMO CONSULT · ${esc(sub)}</div>
</body>
</html>`

  const w = window.open('', '_blank', 'width=900,height=1000')
  if (!w) {
    alert(lang === 'de' ? 'Bitte Pop-ups für den Handbuch-Druck erlauben.' : 'Please allow pop-ups to print the manual.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  // Fonts/Layout kurz laden lassen, dann Druckdialog öffnen
  setTimeout(() => w.print(), 400)
}
