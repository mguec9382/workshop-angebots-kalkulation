import type { Archetype, CatalogArea, CatalogProcess, Industry } from '../types'

/* ═══════════════════════════════════════════════════════════════════════
   MBPC-Prozesskatalog — Seed übernommen aus
   Präsentationen/mbpc-business-central-prozesse.html
   (Microsoft Business Process Catalog + COSMO Branchenprozesse)
   ═══════════════════════════════════════════════════════════════════════ */

type RawArea = Omit<CatalogArea, 'steps' | 'stepsEN'>
interface RawProcess extends Omit<CatalogProcess, 'areas'> {
  areas: RawArea[]
}

const PROCESSES: RawProcess[] = [
  {
    id: 'order-to-cash', catId: 65, icon: '💰', group: 'primary',
    nameDE: 'Auftrag bis Zahlung', nameEN: 'Order to cash',
    intro: 'Vom Verkaufsangebot über Auftrag und Lieferung bis zur Rechnung, Zahlung und Vertriebsanalyse.',
    introEN: 'From sales quote through order and delivery to invoice, payment and sales analysis.',
    areas: [
      { t: 'Verkaufsrichtlinien entwickeln', en: 'Develop sales policies', hint: 'Preis- und Rabattstrategie, Verkaufskanäle sowie Risiko- und Vertriebsrichtlinien festlegen.', hintEN: 'Define pricing and discount strategy, sales channels, and risk and sales policies.', bc: ['Verkaufspreise & Rabatte einrichten', 'Spezielle Preise & Rabatte', 'Zahlungsbedingungen'] },
      { t: 'Verkaufsaufträge verwalten', en: 'Manage sales orders', hint: 'Angebote, Aufträge, Lieferungen und Rücknahmen abwickeln – für B2B, B2C und Shopify.', hintEN: 'Handle quotes, orders, shipments and returns – for B2B, B2C and Shopify.', bc: ['Verkaufsangebote', 'Liefertermin-Zusagen (Order Promising)', 'Sendungsverfolgung', 'Rücknahmen & Stornos', 'Streckengeschäft (Drop Shipment)', 'Shopify-Connector'] },
      { t: 'Debitorenbuchhaltung', en: 'Manage accounts receivable', hint: 'Verkaufsrechnungen, MwSt., Anzahlungen, Abo-Abrechnung und Bankeinzahlungen buchen.', hintEN: 'Post sales invoices, VAT, prepayments, subscription billing and bank deposits.', bc: ['Verkaufsrechnungen', 'MwSt. auf Verkauf/Einkauf', 'Anzahlungsrechnungen', 'Subscription Billing', 'Bankeinzahlungen'] },
      { t: 'Kredit & Mahnwesen', en: 'Manage credit and collections', hint: 'Kreditlimits überwachen, Mahnbedingungen anwenden und Debitorenauszüge erzeugen.', hintEN: 'Monitor credit limits, apply reminder terms and generate customer statements.', bc: ['Zahlungsbedingungen', 'Kreditlimits', 'Unbezahlte Rechnungen korrigieren/stornieren', 'Mahnbedingungen', 'Kontoauszug-Bericht'] },
      { t: 'Vertriebsleistung analysieren', en: 'Analyze sales performance', hint: 'Verkaufsberichte und Power-BI-Analysen zur Steuerung des Vertriebs nutzen.', hintEN: 'Use sales reports and Power BI analytics to steer sales.', bc: ['Verkaufsberichte', 'Power BI Apps nach Funktionsbereich'] },
    ],
  },
  {
    id: 'source-to-pay', catId: 75, icon: '🛒', group: 'primary',
    nameDE: 'Beschaffung bis Zahlung', nameEN: 'Source to pay',
    intro: 'Von der Beschaffungsstrategie über Lieferantenauswahl und Bestellung bis zur Kreditorenzahlung und Analyse.',
    introEN: 'From procurement strategy through supplier selection and ordering to vendor payment and analysis.',
    areas: [
      { t: 'Beschaffungs- & Sourcing-Strategie', en: 'Develop procurement and sourcing strategies', hint: 'Spend-Analyse, Beschaffungsmethoden, Genehmigungshierarchien und Einkaufsrichtlinien definieren.', hintEN: 'Define spend analysis, procurement methods, approval hierarchies and purchasing policies.', bc: ['Einkaufsrichtlinien', 'Genehmigungsworkflows', 'Rahmenbestellungen'] },
      { t: 'Lieferantenbeziehungen', en: 'Manage supplier relationships', hint: 'Qualifizierte Lieferanten auswählen, Kreditorenstammdaten pflegen und Leistung überwachen.', hintEN: 'Select qualified vendors, maintain vendor master data and monitor performance.', bc: ['Kreditoren anlegen & pflegen', 'Lieferantenbewertung'] },
      { t: 'Sourcing & Verträge', en: 'Source and contract goods and services', hint: 'Anfragen, Angebote und Ausschreibungen einholen, bewerten und Verträge registrieren.', hintEN: 'Request, evaluate quotes and tenders and register contracts.', bc: ['Angebotsanfragen', 'Rahmenverträge'] },
      { t: 'Güter & Leistungen beschaffen', en: 'Procure goods and services', hint: 'Bestellanforderungen, Bestellungen und Wareneingänge abwickeln – auch per EDI.', hintEN: 'Handle purchase requisitions, orders and goods receipts – including via EDI.', bc: ['Bestellungen', 'Wareneingang', 'Einkauf erfassen', 'Rücksendungen an Lieferanten'] },
      { t: 'Kreditorenbuchhaltung', en: 'Manage accounts payable', hint: 'Eingangsrechnungen prüfen, Bestellabgleich vornehmen, Zahlungen vorschlagen und ausführen.', hintEN: 'Check incoming invoices, match to orders, propose and execute payments.', bc: ['Einkaufsrechnungen', 'Zahlungen vorschlagen', 'Zahlungen ausführen', 'Anzahlungen'] },
      { t: 'Einkauf analysieren', en: 'Analyze procurement and sourcing', hint: 'Einkaufsvolumen, Lieferantenleistung und Beschaffungsrisiken auswerten.', hintEN: 'Evaluate purchase volume, vendor performance and procurement risks.', bc: ['Einkaufsberichte', 'Power BI'] },
    ],
  },
  {
    id: 'record-to-report', catId: 90, icon: '📊', group: 'support',
    nameDE: 'Erfassen bis Berichten', nameEN: 'Record to report',
    intro: 'Von den Buchhaltungsrichtlinien über die laufende Buchung bis zum Periodenabschluss und Finanzreporting.',
    introEN: 'From accounting policies through ongoing posting to period close and financial reporting.',
    areas: [
      { t: 'Buchhaltungsrichtlinien definieren', en: 'Define accounting policies', hint: 'Mandanten, Kontenplan, Währungen und Wechselkurse als Basis der Finanzbuchhaltung einrichten.', hintEN: 'Set up entities, chart of accounts, currencies and exchange rates as the basis of financial accounting.', bc: ['Kontenplan', 'Finanzberichte', 'Mehrwährung & Wechselkurse', 'Dimensionen'] },
      { t: 'Liquidität verwalten', en: 'Manage cash', hint: 'Bank- und Kassentransaktionen, Bankabstimmung und Zahlungsabgleich steuern.', hintEN: 'Manage bank and cash transactions, bank reconciliation and payment matching.', bc: ['Bankkonten', 'Kontoabstimmung', 'Zahlungsabgleich'] },
      { t: 'Budgets verwalten', en: 'Manage budgets', hint: 'Budgets erstellen, überwachen und Ist-Werte gegen Budget berichten.', hintEN: 'Create, monitor budgets and report actuals against budget.', bc: ['Sachkonto-Budgets', 'Kostenbudgets'] },
      { t: 'Finanztransaktionen erfassen', en: 'Record financial transactions', hint: 'Fibu-Buchungen, Abgrenzungen, Rückstellungen und Genehmigungsworkflows abwickeln.', hintEN: 'Handle GL postings, accruals, provisions and approval workflows.', bc: ['Buchungsblätter', 'Abgrenzungen', 'Wiederkehrende Buchungen'] },
      { t: 'Perioden abschließen', en: 'Close financial periods', hint: 'Nebenbücher abstimmen, Währung neu bewerten, konsolidieren und Jahresabschluss durchführen.', hintEN: 'Reconcile subledgers, revalue currency, consolidate and perform year-end closing.', bc: ['Periodenabschluss', 'Konsolidierung', 'Währungsneubewertung'] },
      { t: 'Finanzleistung analysieren', en: 'Analyze financial performance', hint: 'Bilanz, GuV, Cashflow sowie Abweichungs- und Trendanalysen auswerten.', hintEN: 'Evaluate balance sheet, P&L, cash flow and variance and trend analyses.', bc: ['Finanzberichte', 'Cashflow-Prognose', 'Business Performance Analytics'] },
    ],
  },
  {
    id: 'inventory-to-deliver', catId: 60, icon: '📦', group: 'primary',
    nameDE: 'Bestand bis Auslieferung', nameEN: 'Inventory to deliver',
    intro: 'Von der Lagerorganisation über Bestandsführung und Wareneingang/-ausgang bis zu Qualität, Transport und Analyse.',
    introEN: 'From warehouse organization through inventory management and inbound/outbound to quality, transport and analysis.',
    areas: [
      { t: 'Lagerbetrieb verwalten', en: 'Manage warehouse operations', hint: 'Lager, Lagerplätze und Zonen einrichten sowie Ressourcen für den Lagerbetrieb planen.', hintEN: 'Set up warehouses, bins and zones and plan resources for warehouse operations.', bc: ['Lagereinrichtung', 'Lagerplätze & Zonen'] },
      { t: 'Bestände führen', en: 'Maintain inventory levels', hint: 'Bestandsrichtlinien, Auffüllung, Umlagerungen, Inventur und Zykluszählung managen.', hintEN: 'Manage inventory policies, replenishment, transfers, stocktake and cycle counting.', bc: ['Bestandsauffüllung', 'Umlagerungen', 'Inventur / Cycle Count', 'Bestandskorrekturen'] },
      { t: 'Wareneingang', en: 'Process inbound goods', hint: 'Wareneingang, Prüfung und Einlagerung abwickeln – inklusive Kundenretouren.', hintEN: 'Handle goods receipt, inspection and put-away – including customer returns.', bc: ['Wareneingang', 'Einlagerung', 'Kundenretouren'] },
      { t: 'Warenausgang', en: 'Process outbound goods', hint: 'Kommissionieren, Verpacken und Versenden – inklusive Lieferantenretouren und Cross-Docking.', hintEN: 'Pick, pack and ship – including vendor returns and cross-docking.', bc: ['Kommissionierung', 'Versand', 'Cross-Docking'] },
      { t: 'Bestandsqualität', en: 'Manage inventory quality', hint: 'Artikel prüfen, testen und klassifizieren sowie Nichtkonformitäten verwalten.', hintEN: 'Inspect, test and classify items and manage non-conformities.', bc: ['Qualitätsprüfung', 'Nichtkonformitäten'] },
      { t: 'Fracht & Transport', en: 'Manage freight and transportation', hint: 'Frachtführer, Tarife und Frachtkosten verwalten und den Versand optimieren.', hintEN: 'Manage carriers, rates and freight costs and optimize shipping.', bc: ['Frachtführer', 'Frachtkosten'] },
      { t: 'Lagerbetrieb analysieren', en: 'Analyze warehouse operations', hint: 'KPIs definieren, Lagerleistung messen und Bestände auswerten.', hintEN: 'Define KPIs, measure warehouse performance and evaluate inventory.', bc: ['Lager-KPIs', 'Bestandsanalysen'] },
    ],
  },
  {
    id: 'plan-to-produce', catId: 70, icon: '🏭', group: 'primary',
    nameDE: 'Planen bis Produzieren', nameEN: 'Plan to produce',
    intro: 'Von der Produktionsstrategie über die Feinplanung und Fertigung bis zu Qualität und Produktionsanalyse.',
    introEN: 'From production strategy through detailed scheduling and manufacturing to quality and production analysis.',
    areas: [
      { t: 'Produktionsstrategie', en: 'Develop production strategies', hint: 'Fertigungsart, Ressourcen, Stücklisten und Arbeitspläne festlegen.', hintEN: 'Define manufacturing type, resources, bills of materials and routings.', bc: ['Stücklisten (BOM)', 'Arbeitspläne (Routing)', 'Kapazitäten'] },
      { t: 'Produktion planen', en: 'Plan production operations', hint: 'Aus der Bedarfsplanung einen optimierten Produktionsschedule ableiten.', hintEN: 'Derive an optimized production schedule from demand planning.', bc: ['Fertigungsaufträge', 'Feinplanung', 'Kapazitätsplanung'] },
      { t: 'Produktion durchführen', en: 'Run production operations', hint: 'Material kommissionieren, Aufträge freigeben sowie Verbrauch und Ist-Zeiten rückmelden.', hintEN: 'Pick material, release orders and report consumption and actual times.', bc: ['Auftragsfreigabe', 'Verbrauchsbuchung', 'Ist-Rückmeldung'] },
      { t: 'Produktionsqualität', en: 'Control production quality', hint: 'Prüfpläne, Qualitätstests und Abnahmekriterien im Fertigungsprozess anwenden.', hintEN: 'Apply inspection plans, quality tests and acceptance criteria in the manufacturing process.', bc: ['Prüfpläne', 'Qualitätskontrolle'] },
      { t: 'Produktion analysieren', en: 'Analyze production operations', hint: 'Produktionskennzahlen, Auslastung und Fertigungskosten auswerten.', hintEN: 'Evaluate production metrics, utilization and manufacturing costs.', bc: ['Produktions-KPIs', 'Kostenanalyse'] },
    ],
  },
  {
    id: 'design-to-retire', catId: 40, icon: '🧬', group: 'primary',
    nameDE: 'Entwerfen bis Ausmustern', nameEN: 'Design to retire',
    intro: 'Vom Produktkatalog über Neuprodukteinführung, Kalkulation und Preisgestaltung bis zum Produktlebenszyklus.',
    introEN: 'From product catalog through new product introduction, costing and pricing to the product lifecycle.',
    areas: [
      { t: 'Produktkatalog & -strategie', en: 'Define product catalog and strategy', hint: 'Produkte kategorisieren sowie Sortimente, Kataloge und Attribute pflegen.', hintEN: 'Categorize products and maintain assortments, catalogs and attributes.', bc: ['Artikelkategorien', 'Artikelattribute', 'Sortimente'] },
      { t: 'Neue Produkte einführen', en: 'Introduce new products', hint: 'Idee, Konzept, Design, Test und Markteinführung neuer Produkte steuern.', hintEN: 'Steer idea, concept, design, test and market launch of new products.', bc: ['Neuanlage Artikel', 'Stücklisten', 'Änderungssteuerung'] },
      { t: 'Produktkalkulation', en: 'Define product costing', hint: 'Material-, Fertigungs- und Gemeinkosten mit FIFO, Durchschnitt oder Standard kalkulieren.', hintEN: 'Calculate material, production and overhead costs using FIFO, average or standard.', bc: ['Kalkulationsmethoden', 'Kostenaufrollung'] },
      { t: 'Produktpreise verwalten', en: 'Manage product pricing', hint: 'Preise auf Basis von Kosten, Wettbewerb und Nachfrage steuern.', hintEN: 'Manage prices based on cost, competition and demand.', bc: ['Verkaufspreise', 'Preislisten & Rabatte'] },
      { t: 'Produktlebenszyklus', en: 'Manage product lifecycle', hint: 'Produkte von der Idee bis zur Ausmusterung strategisch steuern.', hintEN: 'Strategically steer products from idea to retirement.', bc: ['Lebenszyklusstatus', 'Auslaufsteuerung'] },
    ],
  },
  {
    id: 'project-to-profit', catId: 80, icon: '📐', group: 'manage',
    nameDE: 'Projekt bis Profit', nameEN: 'Project to profit',
    intro: 'Von der Projektstrategie über Verträge, Planung und Durchführung bis zu Projektfinanzen und Performance-Analyse.',
    introEN: 'From project strategy through contracts, planning and delivery to project financials and performance analysis.',
    areas: [
      { t: 'Projektstrategie', en: 'Develop project strategy', hint: 'Projekt-Charter, Organisation, Rollen sowie Entscheidungs- und Änderungsprozesse festlegen.', hintEN: 'Define project charter, organization, roles and decision and change processes.', bc: ['Projektstruktur', 'Rollen & Verantwortlichkeiten'] },
      { t: 'Projektverträge', en: 'Manage project contracts', hint: 'Vertragsvorlagen, Konditionen, Compliance und Änderungsaufträge verwalten.', hintEN: 'Manage contract templates, terms, compliance and change orders.', bc: ['Vertragsvorlagen', 'Änderungsaufträge'] },
      { t: 'Projekte planen', en: 'Plan projects', hint: 'Umfang, Zeitplan, Ressourcen und Budget mit Arbeitsstrukturplan planen.', hintEN: 'Plan scope, schedule, resources and budget with a work breakdown structure.', bc: ['Projektplanung', 'Ressourcenplanung', 'Budget'] },
      { t: 'Projektabwicklung', en: 'Manage project delivery', hint: 'Projektaufgaben planen, ausführen und überwachen sowie Ressourcen steuern.', hintEN: 'Plan, execute and monitor project tasks and steer resources.', bc: ['Projektaufgaben', 'Leistungserfassung', 'Zeiterfassung'] },
      { t: 'Projektfinanzen', en: 'Manage project financials', hint: 'Schätzungen, Budgets, Projektrechnungen und Umsatzrealisierung verwalten.', hintEN: 'Manage estimates, budgets, project invoices and revenue recognition.', bc: ['Projektrechnungen', 'Umsatzrealisierung', 'Projektbudget'] },
      { t: 'Projektperformance', en: 'Analyze project performance', hint: 'Projektkennzahlen verfolgen, Abweichungen analysieren und Ergebnisse kommunizieren.', hintEN: 'Track project metrics, analyze variances and communicate results.', bc: ['Projekt-KPIs', 'Abweichungsanalyse'] },
    ],
  },
  {
    id: 'hire-to-retire', catId: 55, icon: '👥', group: 'support',
    nameDE: 'Einstellen bis Ausscheiden', nameEN: 'Hire to retire',
    intro: 'Von der Personalstrategie über Recruiting, Entwicklung und Zeitwirtschaft bis zu Vergütung und Benefits.',
    introEN: 'From people strategy through recruiting, development and time management to compensation and benefits.',
    areas: [
      { t: 'Personalstrategie', en: 'Develop people strategy', hint: 'Positionen, Organisationsstruktur, Headcount-Planung und Recruiting definieren.', hintEN: 'Define positions, org structure, headcount planning and recruiting.', bc: ['Organisationsstruktur', 'Headcount-Planung'] },
      { t: 'Recruiting & Onboarding', en: 'Recruit and onboard talent', hint: 'Neue Mitarbeitende einstellen, onboarden und den Employee-Lifecycle steuern.', hintEN: 'Hire and onboard new employees and steer the employee lifecycle.', bc: ['Onboarding-Aufgaben', 'Mitarbeiterstammdaten'] },
      { t: 'Performance & Entwicklung', en: 'Manage performance and growth', hint: 'Ziele, Bewertungen, Skills und Weiterbildung managen.', hintEN: 'Manage goals, reviews, skills and training.', bc: ['Zielvereinbarungen', 'Skills & Kompetenzen'] },
      { t: 'Arbeitsschutz', en: 'Manage workplace compliance', hint: 'Arbeitssicherheit, Gefährdungen, Vorfälle und Sicherheitsaudits verwalten.', hintEN: 'Manage occupational safety, hazards, incidents and safety audits.', bc: ['Sicherheitsprotokolle', 'Vorfallmeldungen'] },
      { t: 'Zeit & Anwesenheit', en: 'Manage time and attendance', hint: 'Arbeitszeiten, Abwesenheiten, Urlaub und Timesheets erfassen.', hintEN: 'Record working hours, absences, leave and timesheets.', bc: ['Abwesenheiten', 'Timesheets'] },
      { t: 'Vergütung & Benefits', en: 'Manage compensation and benefits', hint: 'Vergütungspolitik, Benefits-Enrollment und Lohnabrechnung steuern.', hintEN: 'Steer compensation policy, benefits enrollment and payroll.', bc: ['Vergütungspläne', 'Benefits', 'Lohn-Schnittstelle'] },
    ],
  },
  {
    id: 'quality-to-compliance', catId: 'LS', icon: '🛡️', group: 'regulated', cosmo: true,
    nameDE: 'Qualität & Compliance', nameEN: 'Quality to compliance',
    intro: 'Regulierte End-to-End-Qualitäts- und Compliance-Prozesse für Pharma, MedTech, Life Sciences, Chemie und Food – von der Wareneingangs- und Chargenprüfung über Abweichungs- und CAPA-Management bis zu Dokumentenlenkung, Zulassung, Validierung und Audit.',
    introEN: 'Regulated end-to-end quality and compliance processes for pharma, medtech, life sciences, chemicals and food – from incoming and batch inspection through deviation and CAPA management to document control, market approval, validation and audit.',
    areas: [
      { t: 'Wareneingangs- & Qualitätsprüfung', en: 'Incoming and quality inspection', hint: 'Prüfpläne, Prüfmerkmale und Frage-/Antwort-Vorlagen für Wareneingang, Prozess und Fertigung definieren und QC-Tests durchführen.', hintEN: 'Define inspection plans, characteristics and Q&A templates for incoming, process and production and run QC tests.', bc: ['COSMO Quality Assurance', 'Quality Check (Prüfvorlagen)', 'QC-Setup', 'Prüflose'] },
      { t: 'Sperr-, Quarantäne- & Freigabesteuerung', en: 'Quarantine and release control', hint: 'Bestände über QC-Status sperren, in Quarantäne legen oder freigeben; Verwendungsentscheid und Chargenfreigabe dokumentieren.', hintEN: 'Block, quarantine or release stock via QC status; document usage decision and batch release.', bc: ['QC-Status', 'Quarantäne / Sperrbestand', 'Verwendungsentscheid', 'Chargenfreigabe'] },
      { t: 'Chargenrückverfolgung & UDI', en: 'Batch traceability and UDI', hint: 'Lückenlose Chargen-/Los-Rückverfolgung, UDI-Kennzeichnung sowie Haltbarkeit und Restlaufzeit (MHD) in Planung und Logistik.', hintEN: 'Full batch/lot traceability, UDI labeling and shelf life / remaining life (expiry) in planning and logistics.', bc: ['Batch Tracking', 'Los-/Chargenverfolgung', 'UDI-Kennzeichnung', 'Restlaufzeit / MHD (MRP)'] },
      { t: 'Abweichungs-, Reklamations- & CAPA-Management', en: 'Deviation, complaint and CAPA management', hint: 'Abweichungen, Out-of-Spec-Fälle und Reklamationen erfassen, Ursachen analysieren und Korrektur-/Vorbeugemaßnahmen (CAPA) steuern.', hintEN: 'Record deviations, out-of-spec cases and complaints, analyze root causes and steer corrective/preventive actions (CAPA).', bc: ['COSMO Quality Management Pack', 'Incident: Abweichung / Out of Spec', 'Reklamation (Complaint)', 'CAPA', 'Webcon Connector'] },
      { t: 'Änderungslenkung (Change Control)', en: 'Change control', hint: 'Änderungsanträge stellen, Auswirkungen und Risiken bewerten, genehmigen und die kontrollierte Umsetzung nachweisen.', hintEN: 'Raise change requests, assess impact and risk, approve and evidence controlled implementation.', bc: ['Change Control (QMP)', 'Genehmigungsworkflow', 'Risiko- & Impact-Bewertung'] },
      { t: 'Dokumentenlenkung & Schulung', en: 'Document control and training', hint: 'Gelenkte SOPs und Dokumente über den vollen Lebenszyklus inkl. Schulungsnachweis – GAMP-5-konform.', hintEN: 'Controlled SOPs and documents across the full lifecycle incl. training records – GAMP 5 compliant.', bc: ['Document Control (cDMS)', 'GAMP 5 / GxP', 'Elektronische Signatur', 'Schulungsmanagement', 'COSMO Workflow'] },
      { t: 'Regulatory Affairs & Marktzulassung', en: 'Regulatory affairs and market approval', hint: 'Regulatorische Anforderungen, technische Dokumentation, Konformitätsbewertung sowie Zulassungen, Registrierungen und Kennzeichnung verwalten.', hintEN: 'Manage regulatory requirements, technical documentation, conformity assessment and approvals, registrations and labeling.', bc: ['COSMO Regulatory Affairs', 'Technische Dokumentation', 'Konformitätsbewertung', 'Labeling'] },
      { t: 'Audit, Inspektion & Systemvalidierung', en: 'Audit, inspection and computer system validation', hint: 'Audits und Inspektionen planen und durchführen, Findings und Maßnahmen verfolgen sowie die computergestützte Systemvalidierung (CSV) sicherstellen.', hintEN: 'Plan and run audits and inspections, track findings and actions and ensure computer system validation (CSV).', bc: ['Audit Management', 'Computersystemvalidierung (CSV)', 'Audit Trail', 'GAMP 5'] },
    ],
  },
]

const STEPS: Record<string, string[][]> = {
  'order-to-cash': [
    ['Preis- & Rabattstrukturen definieren', 'Verkaufskanäle & Kundengruppen festlegen', 'Zahlungs- & Lieferbedingungen pflegen', 'Genehmigungsrichtlinien einrichten'],
    ['Verkaufsangebot erstellen', 'Angebot in Auftrag umwandeln', 'Verfügbarkeit & Liefertermin prüfen', 'Kommissionierung & Warenausgang', 'Lieferung buchen', 'Rücknahmen bearbeiten'],
    ['Auftrag fakturieren', 'Rechnung buchen & versenden', 'Zahlungseingang erfassen', 'Offene Posten ausgleichen', 'Anzahlungen fakturieren'],
    ['Kreditlimit prüfen', 'Fälligkeiten überwachen', 'Mahnung erstellen', 'Zinsrechnung erzeugen', 'Inkasso nachverfolgen'],
    ['Verkaufskennzahlen auswerten', 'Deckungsbeitrag analysieren', 'Debitorenalter prüfen', 'Power-BI-Bericht aufrufen'],
  ],
  'source-to-pay': [
    ['Einkaufsbedarf analysieren', 'Beschaffungsmethode wählen', 'Einkaufsrichtlinien definieren', 'Genehmigungshierarchie einrichten'],
    ['Lieferant qualifizieren', 'Kreditor anlegen', 'Stammdaten pflegen', 'Lieferantenleistung bewerten'],
    ['Angebotsanfrage (RFQ) versenden', 'Angebote vergleichen', 'Lieferant auswählen', 'Rahmenvertrag registrieren'],
    ['Bestellanforderung erstellen', 'Bestellung anlegen & freigeben', 'Bestellung an Lieferant senden', 'Wareneingang buchen', 'Rücksendung bearbeiten'],
    ['Eingangsrechnung erfassen', 'Bestellabgleich (3-Way-Match)', 'Rechnung buchen', 'Zahlungsvorschlag erstellen', 'Zahlung ausführen'],
    ['Einkaufsvolumen auswerten', 'Lieferantenperformance messen', 'Beschaffungsrisiken bewerten'],
  ],
  'record-to-report': [
    ['Mandant/Buchungskreis einrichten', 'Kontenplan aufbauen', 'Dimensionen definieren', 'Währungen & Wechselkurse pflegen'],
    ['Bankkonten verwalten', 'Zahlungsein-/ausgänge buchen', 'Kontoauszug abgleichen', 'Bankabstimmung durchführen'],
    ['Budget anlegen', 'Budgetwerte erfassen', 'Ist gegen Budget berichten'],
    ['Fibu-Buchungsblatt erfassen', 'Abgrenzungen & Rückstellungen buchen', 'Wiederkehrende Buchungen ausführen', 'Buchung genehmigen'],
    ['Nebenbücher abstimmen', 'Währungsneubewertung', 'Perioden sperren', 'Konsolidierung', 'Jahresabschluss'],
    ['Finanzberichte erstellen', 'Cashflow prognostizieren', 'Abweichungs- & Trendanalyse'],
  ],
  'inventory-to-deliver': [
    ['Lager & Lagerorte einrichten', 'Zonen & Lagerplätze definieren', 'Ressourcen zuordnen'],
    ['Bestandsrichtlinien festlegen', 'Auffüllung planen', 'Umlagerung buchen', 'Inventur / Zykluszählung', 'Bestandskorrektur'],
    ['Wareneingang anmelden', 'Ware prüfen', 'Einlagerung buchen', 'Kundenretoure annehmen'],
    ['Kommissionierung erstellen', 'Ware verpacken', 'Versand buchen', 'Cross-Docking'],
    ['Prüfauftrag anlegen', 'Qualität testen', 'Artikel klassifizieren', 'Nichtkonformität bearbeiten'],
    ['Frachtführer verwalten', 'Tarife pflegen', 'Frachtkosten abgleichen'],
    ['Lager-KPIs definieren', 'Leistung messen', 'Bestand auswerten'],
  ],
  'plan-to-produce': [
    ['Fertigungsart wählen', 'Stückliste (BOM) anlegen', 'Arbeitsplan (Routing) definieren', 'Kapazitäten einrichten'],
    ['Bedarf aus Planung übernehmen', 'Fertigungsauftrag erstellen', 'Feinplanung / Sequenzierung', 'Kapazität abgleichen'],
    ['Material kommissionieren', 'Auftrag freigeben', 'Verbrauch buchen', 'Ist-Zeit rückmelden', 'Fertigmeldung buchen'],
    ['Prüfplan zuordnen', 'Qualitätstest durchführen', 'Ergebnis erfassen', 'Sperren / Freigeben'],
    ['Produktions-KPIs auswerten', 'Auslastung messen', 'Fertigungskosten analysieren'],
  ],
  'design-to-retire': [
    ['Artikelkategorien definieren', 'Attribute zuordnen', 'Sortiment & Katalog pflegen'],
    ['Produktidee erfassen', 'Artikel anlegen', 'Stückliste / Design definieren', 'Änderung steuern', 'Markteinführung'],
    ['Kalkulationsmethode wählen', 'Kosten erfassen', 'Kostenaufrollung', 'Standardkosten aktualisieren'],
    ['Preisstrategie festlegen', 'Verkaufspreis kalkulieren', 'Preisliste pflegen', 'Rabatte definieren'],
    ['Lebenszyklusstatus setzen', 'Sperren / Aktivieren', 'Auslauf steuern', 'Ausmusterung'],
  ],
  'project-to-profit': [
    ['Projekt-Charter erstellen', 'Projektorganisation definieren', 'Rollen zuweisen', 'Änderungsprozess festlegen'],
    ['Vertragsvorlage wählen', 'Konditionen verhandeln', 'Vertrag registrieren', 'Änderungsauftrag verwalten'],
    ['Anforderungen erfassen', 'Arbeitsstrukturplan (WBS)', 'Zeitplan erstellen', 'Ressourcen planen', 'Budget festlegen'],
    ['Aufgaben ausführen', 'Leistung erfassen', 'Zeit buchen', 'Material & Kosten erfassen', 'Fortschritt überwachen'],
    ['Schätzung prüfen', 'Budget überwachen', 'Projektrechnung erstellen', 'Umsatz realisieren'],
    ['Projekt-KPIs verfolgen', 'Abweichung analysieren', 'Statusbericht kommunizieren'],
  ],
  'hire-to-retire': [
    ['Positionen definieren', 'Organisationsstruktur modellieren', 'Headcount planen', 'Recruiting starten'],
    ['Kandidat auswählen', 'Angebot erstellen', 'Mitarbeiter anlegen', 'Onboarding-Aufgaben zuweisen'],
    ['Ziele definieren', 'Leistung bewerten', 'Skills erfassen', 'Weiterbildung planen'],
    ['Sicherheitsprotokolle definieren', 'Schulungen durchführen', 'Vorfall melden', 'Audit durchführen'],
    ['Abwesenheit beantragen', 'Antrag genehmigen', 'Zeit erfassen', 'Timesheet freigeben'],
    ['Vergütung festlegen', 'Benefits zuordnen', 'Enrollment durchführen', 'Lohn-Schnittstelle bedienen'],
  ],
  'quality-to-compliance': [
    ['Prüfplan & Prüfmerkmale definieren', 'Prüfvorlage (Q&A) zuordnen', 'QC-Test bei Wareneingang/Fertigung anlegen', 'Prüfergebnisse erfassen', 'Prüfentscheid dokumentieren'],
    ['QC-Status einrichten', 'Ware in Quarantäne buchen', 'Charge bewerten', 'Verwendungsentscheid treffen', 'Charge freigeben oder sperren'],
    ['Chargen-/Los-Nummern vergeben', 'UDI-Kennzeichnung erzeugen', 'Vorwärts-/Rückwärtsverfolgung', 'Restlaufzeit / MHD überwachen', 'Rückruf simulieren'],
    ['Abweichung / Out of Spec erfassen', 'Reklamation aufnehmen', 'Ursachenanalyse (Root Cause)', 'CAPA definieren & umsetzen', 'Wirksamkeit prüfen & abschließen'],
    ['Änderungsantrag stellen', 'Impact- & Risikobewertung', 'Änderung genehmigen', 'Umsetzung steuern', 'Änderung dokumentieren'],
    ['SOP / Dokument erstellen', 'Review- & Freigabeworkflow', 'Elektronische Signatur', 'Versionierung & Archivierung', 'Schulung zuweisen & nachweisen'],
    ['Regulatorische Anforderungen erfassen', 'Technische Dokumentation pflegen', 'Konformität bewerten', 'Zulassung / Registrierung verwalten', 'Kennzeichnung & Labeling freigeben'],
    ['Auditplan erstellen', 'Interne / externe Audits durchführen', 'Findings & Maßnahmen verfolgen', 'Systemvalidierung (CSV / GAMP 5)', 'Audit-Trail & Inspektionsbereitschaft'],
  ],
}

const STEPS_EN: Record<string, string[][]> = {
  'order-to-cash': [
    ['Define price & discount structures', 'Define sales channels & customer groups', 'Maintain payment & delivery terms', 'Set up approval policies'],
    ['Create sales quote', 'Convert quote to order', 'Check availability & delivery date', 'Pick & ship goods', 'Post shipment', 'Process returns'],
    ['Invoice order', 'Post & send invoice', 'Record incoming payment', 'Apply open entries', 'Invoice prepayments'],
    ['Check credit limit', 'Monitor due dates', 'Create reminder', 'Generate finance charge', 'Track collections'],
    ['Evaluate sales metrics', 'Analyze contribution margin', 'Review customer aging', 'Open Power BI report'],
  ],
  'source-to-pay': [
    ['Analyze purchase demand', 'Choose procurement method', 'Define purchasing policies', 'Set up approval hierarchy'],
    ['Qualify vendor', 'Create vendor', 'Maintain master data', 'Evaluate vendor performance'],
    ['Send request for quote (RFQ)', 'Compare quotes', 'Select vendor', 'Register blanket contract'],
    ['Create purchase requisition', 'Create & release order', 'Send order to vendor', 'Post goods receipt', 'Process return'],
    ['Record incoming invoice', 'Order matching (3-way match)', 'Post invoice', 'Create payment suggestion', 'Execute payment'],
    ['Evaluate purchase volume', 'Measure vendor performance', 'Assess procurement risks'],
  ],
  'record-to-report': [
    ['Set up entity/company', 'Build chart of accounts', 'Define dimensions', 'Maintain currencies & exchange rates'],
    ['Manage bank accounts', 'Post incoming/outgoing payments', 'Reconcile bank statement', 'Perform bank reconciliation'],
    ['Create budget', 'Enter budget values', 'Report actual vs. budget'],
    ['Record GL journal', 'Post accruals & provisions', 'Run recurring postings', 'Approve posting'],
    ['Reconcile subledgers', 'Currency revaluation', 'Close periods', 'Consolidation', 'Year-end closing'],
    ['Create financial reports', 'Forecast cash flow', 'Variance & trend analysis'],
  ],
  'inventory-to-deliver': [
    ['Set up warehouse & locations', 'Define zones & bins', 'Assign resources'],
    ['Define inventory policies', 'Plan replenishment', 'Post transfer', 'Stocktake / cycle count', 'Inventory adjustment'],
    ['Register goods receipt', 'Inspect goods', 'Post put-away', 'Accept customer return'],
    ['Create pick', 'Pack goods', 'Post shipment', 'Cross-docking'],
    ['Create inspection order', 'Test quality', 'Classify item', 'Handle non-conformity'],
    ['Manage carriers', 'Maintain rates', 'Match freight costs'],
    ['Define warehouse KPIs', 'Measure performance', 'Evaluate inventory'],
  ],
  'plan-to-produce': [
    ['Choose manufacturing type', 'Create bill of materials (BOM)', 'Define routing', 'Set up capacities'],
    ['Take demand from planning', 'Create production order', 'Detailed scheduling / sequencing', 'Balance capacity'],
    ['Pick material', 'Release order', 'Post consumption', 'Report actual time', 'Post output'],
    ['Assign inspection plan', 'Run quality test', 'Record result', 'Block / release'],
    ['Evaluate production KPIs', 'Measure utilization', 'Analyze manufacturing costs'],
  ],
  'design-to-retire': [
    ['Define item categories', 'Assign attributes', 'Maintain assortment & catalog'],
    ['Capture product idea', 'Create item', 'Define BOM / design', 'Control change', 'Market launch'],
    ['Choose costing method', 'Record costs', 'Cost rollup', 'Update standard costs'],
    ['Define pricing strategy', 'Calculate sales price', 'Maintain price list', 'Define discounts'],
    ['Set lifecycle status', 'Block / activate', 'Control phase-out', 'Retirement'],
  ],
  'project-to-profit': [
    ['Create project charter', 'Define project organization', 'Assign roles', 'Define change process'],
    ['Choose contract template', 'Negotiate terms', 'Register contract', 'Manage change order'],
    ['Capture requirements', 'Work breakdown structure (WBS)', 'Create schedule', 'Plan resources', 'Set budget'],
    ['Execute tasks', 'Record work', 'Post time', 'Record material & costs', 'Monitor progress'],
    ['Review estimate', 'Monitor budget', 'Create project invoice', 'Recognize revenue'],
    ['Track project KPIs', 'Analyze variance', 'Communicate status report'],
  ],
  'hire-to-retire': [
    ['Define positions', 'Model org structure', 'Plan headcount', 'Start recruiting'],
    ['Select candidate', 'Create offer', 'Create employee', 'Assign onboarding tasks'],
    ['Define goals', 'Assess performance', 'Record skills', 'Plan training'],
    ['Define safety protocols', 'Conduct training', 'Report incident', 'Conduct audit'],
    ['Request absence', 'Approve request', 'Record time', 'Approve timesheet'],
    ['Set compensation', 'Assign benefits', 'Run enrollment', 'Serve payroll interface'],
  ],
  'quality-to-compliance': [
    ['Define inspection plan & characteristics', 'Assign inspection template (Q&A)', 'Create QC test at receipt/production', 'Record inspection results', 'Document inspection decision'],
    ['Set up QC status', 'Post goods to quarantine', 'Assess batch', 'Make usage decision', 'Release or block batch'],
    ['Assign batch/lot numbers', 'Generate UDI labeling', 'Forward/backward tracing', 'Monitor remaining life / expiry', 'Simulate recall'],
    ['Record deviation / out of spec', 'Log complaint', 'Root cause analysis', 'Define & implement CAPA', 'Verify effectiveness & close'],
    ['Raise change request', 'Impact & risk assessment', 'Approve change', 'Steer implementation', 'Document change'],
    ['Create SOP / document', 'Review & approval workflow', 'Electronic signature', 'Versioning & archiving', 'Assign & evidence training'],
    ['Capture regulatory requirements', 'Maintain technical documentation', 'Assess conformity', 'Manage approval / registration', 'Release labeling'],
    ['Create audit plan', 'Conduct internal / external audits', 'Track findings & actions', 'System validation (CSV / GAMP 5)', 'Audit trail & inspection readiness'],
  ],
}

/** Prozesse + Feature-Steps zum vollständigen Katalog zusammenführen */
export const CATALOG: CatalogProcess[] = PROCESSES.map((p) => ({
  ...p,
  areas: p.areas.map((a, idx): CatalogArea => ({
    ...a,
    steps: (STEPS[p.id] && STEPS[p.id][idx]) || [],
    stepsEN: (STEPS_EN[p.id] && STEPS_EN[p.id][idx]) || (STEPS[p.id] && STEPS[p.id][idx]) || [],
  })),
}))

export function processById(id: string): CatalogProcess | undefined {
  return CATALOG.find((p) => p.id === id)
}

export const GROUP_LABEL: Record<CatalogProcess['group'], { de: string; en: string }> = {
  primary: { de: 'Primärprozess', en: 'Primary process' },
  support: { de: 'Unterstützungsprozess', en: 'Support process' },
  manage: { de: 'Arbeitssteuerung', en: 'Management process' },
  regulated: { de: 'Regulierte Industrie', en: 'Regulated industry' },
}

/* ═══════════════════════════════════════════════════════════════════════
   Branchen-Archetypen (COSMO CONSULT Branchenmodelle)
   ═══════════════════════════════════════════════════════════════════════ */
export const ARCHETYPES: Archetype[] = [
  { id: 'all', icon: '🌐', label: 'Alle Prozesse', labelEN: 'All processes', desc: 'Vollständiger Business-Central-Workload – alle End-to-End-Prozesse inkl. COSMO Qualität & Compliance.', descEN: 'Full Business Central workload – all end-to-end processes incl. COSMO quality & compliance.', procs: null },
  { id: 'process', icon: '🧪', label: 'Prozessfertigung / Chemie', labelEN: 'Process manufacturing / chemicals', desc: 'Rezeptur- und ansatzbasierte Fertigung, Bulk-Handling, Chargenverfolgung.', descEN: 'Recipe- and batch-based manufacturing, bulk handling, batch traceability.', procs: ['quality-to-compliance', 'plan-to-produce', 'inventory-to-deliver', 'source-to-pay', 'record-to-report', 'order-to-cash'] },
  { id: 'discrete', icon: '⚙️', label: 'Diskrete Fertigung', labelEN: 'Discrete manufacturing', desc: 'Serien- und Variantenfertigung mit Stücklisten, Arbeitsplänen und Produktentwicklung.', descEN: 'Series and variant manufacturing with BOMs, routings and product development.', procs: ['design-to-retire', 'plan-to-produce', 'inventory-to-deliver', 'source-to-pay', 'order-to-cash', 'record-to-report'] },
  { id: 'trade', icon: '🛍️', label: 'Handel & Distribution', labelEN: 'Trade & distribution', desc: 'Handel ohne Eigenfertigung – Beschaffung, Lager, Verkauf und Finanzen.', descEN: 'Trade without own production – procurement, warehouse, sales and finance.', procs: ['order-to-cash', 'source-to-pay', 'inventory-to-deliver', 'record-to-report'] },
  { id: 'services', icon: '💼', label: 'Dienstleistung / Projektgeschäft', labelEN: 'Services / project business', desc: 'Projekt- und Serviceabwicklung, Ressourcen- und Personaleinsatz, Abrechnung.', descEN: 'Project and service delivery, resource and staff deployment, billing.', procs: ['project-to-profit', 'order-to-cash', 'source-to-pay', 'hire-to-retire', 'record-to-report'] },
]

export function archetypeById(id: string): Archetype {
  return ARCHETYPES.find((a) => a.id === id) || ARCHETYPES[0]
}

/**
 * Übersetzt die semantischen Prozess-IDs der Archetypen/Branchen (altes Katalog-
 * modell) auf die numerischen catId-Präfixe des COSMO-Standard-MBPC.
 * So funktionieren Branchen-Vorbelegung und Fokus-Hervorhebung auch mit dem
 * neuen COSMO-MBPC (dessen Prozesse eigene IDs, aber stabile Nummern tragen).
 */
export const ARCHETYPE_PROC_TO_CATID: Record<string, number> = {
  'order-to-cash': 65,
  'source-to-pay': 75,
  'inventory-to-deliver': 60,
  'record-to-report': 90,
  'plan-to-produce': 70,
  'design-to-retire': 40,
  'project-to-profit': 80,
  'hire-to-retire': 55,
  // quality-to-compliance: kein direkter COSMO-End-to-End-Prozess (Qualität ist
  // im COSMO-MBPC prozessübergreifend eingebettet) → keine Nummernzuordnung.
}

/**
 * true, wenn ein Katalogprozess zu einer der Referenz-IDs passt – entweder per
 * direkter Prozess-ID (statischer/alter Katalog) oder per catId-Nummer (COSMO-MBPC).
 */
export function processMatchesRefs(
  proc: { id: string; catId: string | number },
  refIds: string[],
): boolean {
  if (refIds.includes(proc.id)) return true
  const num = typeof proc.catId === 'number' ? proc.catId : parseInt(String(proc.catId), 10)
  if (!Number.isFinite(num)) return false
  return refIds.some((r) => ARCHETYPE_PROC_TO_CATID[r] === num)
}

/* ═══════════════════════════════════════════════════════════════════════
   Branchen (COSMO CONSULT) mit Prozess-Overlay (branchenspezifische Betonung)
   ═══════════════════════════════════════════════════════════════════════ */
export const INDUSTRIES: Industry[] = [
  // ── Regulierte Industrien (COSMO Qualität & Compliance) ──
  { id: 'pharma', label: 'Pharma / Life Sciences', labelEN: 'Pharma / life sciences', archetypeId: 'process', overlay: ['quality-to-compliance', 'plan-to-produce'] },
  { id: 'medtec', label: 'MedTech / Medizintechnik', labelEN: 'MedTech / medical technology', archetypeId: 'discrete', overlay: ['quality-to-compliance', 'design-to-retire'] },
  { id: 'biotec', label: 'BioTech', labelEN: 'BioTech', archetypeId: 'process', overlay: ['quality-to-compliance', 'plan-to-produce'] },
  { id: 'kosmetik', label: 'Kosmetik', labelEN: 'Cosmetics', archetypeId: 'process', overlay: ['quality-to-compliance', 'plan-to-produce'] },
  { id: 'food', label: 'Lebensmittel & Nahrungsergänzung', labelEN: 'Food & supplements', archetypeId: 'process', overlay: ['quality-to-compliance', 'inventory-to-deliver'] },
  { id: 'chemie', label: 'Chemie', labelEN: 'Chemicals', archetypeId: 'process', overlay: ['quality-to-compliance', 'plan-to-produce'] },
  // ── Fertigung ──
  { id: 'maschinenbau', label: 'Maschinen- & Anlagenbau', labelEN: 'Machinery & plant engineering', archetypeId: 'discrete', overlay: ['design-to-retire', 'plan-to-produce', 'project-to-profit'] },
  { id: 'automotive', label: 'Automotive & Zulieferindustrie', labelEN: 'Automotive & supplier industry', archetypeId: 'discrete', overlay: ['plan-to-produce', 'inventory-to-deliver', 'quality-to-compliance'] },
  { id: 'metall', label: 'Metallverarbeitung', labelEN: 'Metal processing', archetypeId: 'discrete', overlay: ['plan-to-produce', 'inventory-to-deliver'] },
  { id: 'elektronik', label: 'Elektronik & Elektrotechnik', labelEN: 'Electronics & electrical engineering', archetypeId: 'discrete', overlay: ['design-to-retire', 'plan-to-produce'] },
  { id: 'kunststoff', label: 'Kunststoff & Gummi', labelEN: 'Plastics & rubber', archetypeId: 'process', overlay: ['plan-to-produce', 'inventory-to-deliver'] },
  { id: 'moebel', label: 'Möbel- & Holzindustrie', labelEN: 'Furniture & wood industry', archetypeId: 'discrete', overlay: ['design-to-retire', 'plan-to-produce'] },
  { id: 'textil', label: 'Textil & Bekleidung', labelEN: 'Textiles & apparel', archetypeId: 'discrete', overlay: ['plan-to-produce', 'inventory-to-deliver'] },
  { id: 'getraenke', label: 'Getränkeindustrie', labelEN: 'Beverage industry', archetypeId: 'process', overlay: ['plan-to-produce', 'inventory-to-deliver'] },
  { id: 'bau', label: 'Bau & Baustoffe', labelEN: 'Construction & building materials', archetypeId: 'discrete', overlay: ['project-to-profit', 'inventory-to-deliver'] },
  // ── Handel & Distribution ──
  { id: 'grosshandel', label: 'Groß- & Außenhandel', labelEN: 'Wholesale & foreign trade', archetypeId: 'trade', overlay: ['order-to-cash', 'source-to-pay', 'inventory-to-deliver'] },
  { id: 'einzelhandel', label: 'Einzelhandel / Retail', labelEN: 'Retail', archetypeId: 'trade', overlay: ['order-to-cash', 'inventory-to-deliver'] },
  { id: 'logistik', label: 'Logistik & Transport', labelEN: 'Logistics & transportation', archetypeId: 'trade', overlay: ['inventory-to-deliver', 'source-to-pay'] },
  // ── Dienstleistung & Projektgeschäft ──
  { id: 'dienstleistung', label: 'Professionelle Dienstleistungen', labelEN: 'Professional services', archetypeId: 'services', overlay: ['project-to-profit', 'order-to-cash'] },
  { id: 'projektfertigung', label: 'Projekt- & Auftragsfertigung (ETO)', labelEN: 'Engineer-to-order / project manufacturing', archetypeId: 'services', overlay: ['project-to-profit', 'design-to-retire', 'plan-to-produce'] },
  { id: 'energie', label: 'Energie & Versorgung', labelEN: 'Energy & utilities', archetypeId: 'services', overlay: ['project-to-profit', 'record-to-report'] },
  { id: 'other', label: 'Sonstige', labelEN: 'Other', archetypeId: 'all', overlay: [] },
]

export function industryById(id: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.id === id)
}

/**
 * Findet eine Branche über die statischen Standard-Branchen hinaus auch in den
 * benutzerdefinierten Branchen (unter Parameter gepflegt).
 */
export function findIndustry(id: string, custom: Industry[] = []): Industry | undefined {
  return INDUSTRIES.find((i) => i.id === id) || custom.find((i) => i.id === id)
}

/**
 * Effektives Prozess-Overlay einer Branche (branchenspezifische Betonung).
 * Standard-Branchen können unter Parameter überschrieben werden (`overrides`);
 * ohne Override gilt das im Katalog hinterlegte Default-Overlay.
 */
export function industryOverlay(
  id: string,
  custom: Industry[] = [],
  overrides: Record<string, string[]> = {},
): string[] {
  const std = INDUSTRIES.find((i) => i.id === id)
  if (std) return overrides[id] ?? std.overlay
  return custom.find((i) => i.id === id)?.overlay ?? []
}

/** Feature-Key aus Prozess/Area/Step-Index */
export function featureKey(processId: string, areaIdx: number, stepIdx: number): string {
  return `${processId}::${areaIdx}::${stepIdx}`
}

export function areaKey(processId: string, areaIdx: number): string {
  return `${processId}::${areaIdx}`
}

/** Produktpool für Mapping-Auswahl (Microsoft / COSMO / Third-Party) */
export const PRODUCT_POOL: { id: string; label: string; vendor: 'microsoft' | 'cosmo' | 'thirdparty' }[] = [
  { id: 'bc', label: 'Microsoft Dynamics 365 Business Central', vendor: 'microsoft' },
  { id: 'bc-premium', label: 'Business Central Premium (Fertigung/Service)', vendor: 'microsoft' },
  { id: 'power-bi', label: 'Microsoft Power BI', vendor: 'microsoft' },
  { id: 'power-platform', label: 'Microsoft Power Platform', vendor: 'microsoft' },
  { id: 'd365-hr', label: 'Dynamics 365 Human Resources', vendor: 'microsoft' },
  { id: 'cosmo-am', label: 'COSMO Advanced Manufacturing Pack', vendor: 'cosmo' },
  { id: 'cosmo-qmp', label: 'COSMO Quality Management Pack', vendor: 'cosmo' },
  { id: 'cosmo-ls', label: 'COSMO Life Science Pack', vendor: 'cosmo' },
  { id: 'cosmo-reg', label: 'COSMO Regulatory Affairs', vendor: 'cosmo' },
  { id: 'cosmo-psp', label: 'COSMO Professional Services Pack', vendor: 'cosmo' },
  { id: 'continia', label: 'Continia Document Capture / Payment', vendor: 'thirdparty' },
  { id: 'webcon', label: 'WEBCON BPS', vendor: 'thirdparty' },
]

export function productById(id: string) {
  return PRODUCT_POOL.find((p) => p.id === id)
}
