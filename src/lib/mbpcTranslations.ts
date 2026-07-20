/* ═══════════════════════════════════════════════════════════════════════
   Deutsche Übersetzung des Microsoft Business Process Catalog (Workload-MBPC).

   Der MBPC-Export ist englisch. Bei Sprache „DE" werden die Titel über ein
   kuratiertes Glossar übersetzt:
     1. Exakte Phrasen-Overrides (alle 15 End-to-End-Prozesse + 94 Bereiche,
        sowie häufige Prozess-Schritte) — höchste Qualität.
     2. Verb-Umstellung: englisches Muster „<Verb> <Objekt>" →
        deutsches „<Objekt> <Verb im Infinitiv>" (z. B. „Manage sales orders"
        → „Verkaufsaufträge verwalten").
     3. Nicht übersetzbare Begriffe fallen auf Englisch zurück (best effort).

   Da sich der MBPC häufig ändert, deckt das Glossar die Standard-Terminologie
   ab; neue/unbekannte Begriffe nach einem Re-Import bleiben englisch, bis sie
   hier ergänzt werden.
   ═══════════════════════════════════════════════════════════════════════ */

/** End-to-End-Prozesse (Title 2) – idiomatische deutsche Entsprechungen. */
const E2E_DE: Record<string, string> = {
  'Acquire to dispose': 'Beschaffung bis Ausmusterung',
  'Administer to operate': 'Verwalten bis Betreiben',
  'Case to resolution': 'Fall bis Lösung',
  'Concept to market': 'Konzept bis Markt',
  'Design to retire': 'Entwerfen bis Ausmustern',
  'Forecast to plan': 'Prognose bis Planung',
  'Hire to retire': 'Einstellen bis Ausscheiden',
  'Inventory to deliver': 'Bestand bis Auslieferung',
  'Order to cash': 'Auftrag bis Zahlung',
  'Plan to produce': 'Planen bis Produzieren',
  'Project to profit': 'Projekt bis Profit',
  'Prospect to quote': 'Interessent bis Angebot',
  'Record to report': 'Erfassen bis Berichten',
  'Service to deliver': 'Service bis Auslieferung',
  'Source to pay': 'Beschaffung bis Zahlung',
}

/** Prozessbereiche (Title 3) + häufige Schritte – exakte deutsche Phrasen. */
const PHRASE_DE: Record<string, string> = {
  // ---- Prozessbereiche (94) ----
  'Define asset strategy': 'Anlagenstrategie definieren',
  'Acquire assets': 'Anlagen beschaffen',
  'Manage active assets': 'Aktive Anlagen verwalten',
  'Perform asset maintenance': 'Anlagenwartung durchführen',
  'Dispose of assets': 'Anlagen ausmustern',
  'Analyze assets': 'Anlagen analysieren',
  'Implement solutions': 'Lösungen implementieren',
  'Define business continuity plan': 'Business-Continuity-Plan definieren',
  'Manage licensing and entitlements': 'Lizenzierung und Berechtigungen verwalten',
  'Administer system features': 'Systemfunktionen administrieren',
  'Manage system access and security': 'Systemzugriff und Sicherheit verwalten',
  'Train users and increase adoption': 'Anwender schulen und Adoption steigern',
  'Monitor systems, environments, and capacity': 'Systeme, Umgebungen und Kapazität überwachen',
  'Manage background jobs': 'Hintergrundjobs verwalten',
  'Manage notifications alerts': 'Benachrichtigungen und Warnungen verwalten',
  'Uptake software releases': 'Software-Releases einspielen',
  'Manage data': 'Daten verwalten',
  'Manage system compliance': 'System-Compliance verwalten',
  'Support systems': 'Systeme unterstützen',
  'Establish a knowledge base': 'Wissensdatenbank aufbauen',
  'Define customer and employee service operations': 'Kunden- und Mitarbeiterservice definieren',
  'Intake cases': 'Fälle aufnehmen',
  'Manage and work on cases': 'Fälle verwalten und bearbeiten',
  'Analyze case performance': 'Fall-Performance analysieren',
  'Develop marketing strategy': 'Marketingstrategie entwickeln',
  'Research and develop offerings': 'Angebote erforschen und entwickeln',
  'Manage service offerings': 'Serviceangebote verwalten',
  'Prepare marketing campaigns': 'Marketingkampagnen vorbereiten',
  'Manage marketing campaigns': 'Marketingkampagnen verwalten',
  'Analyze marketing operations': 'Marketingaktivitäten analysieren',
  'Develop product strategy': 'Produktstrategie entwickeln',
  'Introduce products': 'Produkte einführen',
  'Manage active products': 'Aktive Produkte verwalten',
  'Retire products': 'Produkte ausmustern',
  'Analyze product performance': 'Produkt-Performance analysieren',
  'Develop business strategy': 'Geschäftsstrategie entwickeln',
  'Conduct sales and operations planning': 'Vertriebs- und Betriebsplanung durchführen',
  'Execute sales and operations': 'Vertrieb und Betrieb ausführen',
  'Conduct financial planning': 'Finanzplanung durchführen',
  'Analyze business performance': 'Geschäftsperformance analysieren',
  'Develop people strategy': 'Personalstrategie entwickeln',
  'Recruit and onboard talent': 'Talente rekrutieren und einarbeiten',
  'Manage workplace compliance': 'Arbeitsplatz-Compliance verwalten',
  'Manage performance and growth': 'Leistung und Entwicklung verwalten',
  'Manage time and attendance': 'Zeit und Anwesenheit verwalten',
  'Manage compensation and benefits': 'Vergütung und Benefits verwalten',
  'Offboard talent': 'Talente offboarden',
  'Analyze HR programs': 'HR-Programme analysieren',
  'Manage warehouse operations': 'Lagerbetrieb verwalten',
  'Maintain inventory levels': 'Bestände führen',
  'Process inbound goods': 'Wareneingang abwickeln',
  'Process outbound goods': 'Warenausgang abwickeln',
  'Manage inventory quality': 'Bestandsqualität verwalten',
  'Manage freight and transportation': 'Fracht und Transport verwalten',
  'Analyze warehouse operations': 'Lagerbetrieb analysieren',
  'Develop sales policies': 'Verkaufsrichtlinien entwickeln',
  'Manage sales orders': 'Verkaufsaufträge verwalten',
  'Manage accounts receivable': 'Debitorenbuchhaltung verwalten',
  'Manage credit and collections': 'Kredit und Mahnwesen verwalten',
  'Analyze sales performance': 'Vertriebsleistung analysieren',
  'Develop production strategies': 'Produktionsstrategien entwickeln',
  'Plan production operations': 'Produktion planen',
  'Run production operations': 'Produktion durchführen',
  'Control production quality': 'Produktionsqualität steuern',
  'Analyze production operations': 'Produktion analysieren',
  'Develop project strategy': 'Projektstrategie entwickeln',
  'Manage project contracts': 'Projektverträge verwalten',
  'Plan projects': 'Projekte planen',
  'Manage project delivery': 'Projektabwicklung verwalten',
  'Manage project financials': 'Projektfinanzen verwalten',
  'Analyze project performance': 'Projektperformance analysieren',
  'Manage customer relationships': 'Kundenbeziehungen verwalten',
  'Identify and qualify leads': 'Leads identifizieren und qualifizieren',
  'Define sales strategy and policies': 'Vertriebsstrategie und -richtlinien definieren',
  'Pursue opportunities': 'Verkaufschancen verfolgen',
  'Estimate and quote sales': 'Verkäufe schätzen und anbieten',
  'Analyze sales': 'Vertrieb analysieren',
  'Define accounting policies': 'Buchhaltungsrichtlinien definieren',
  'Manage cash': 'Liquidität verwalten',
  'Manage budgets': 'Budgets verwalten',
  'Record financial transactions': 'Finanztransaktionen erfassen',
  'Close financial periods': 'Perioden abschließen',
  'Analyze financial performance': 'Finanzleistung analysieren',
  'Develop service strategy': 'Servicestrategie entwickeln',
  'Plan service work': 'Servicearbeiten planen',
  'Manage service work': 'Servicearbeiten verwalten',
  'Deliver services': 'Services erbringen',
  'Analyze service performance': 'Serviceleistung analysieren',
  'Develop procurement and sourcing strategy': 'Beschaffungs- und Sourcing-Strategie entwickeln',
  'Manage supplier relationships': 'Lieferantenbeziehungen verwalten',
  'Source and contract goods and services': 'Waren und Leistungen beschaffen und vertraglich binden',
  'Procure goods and services': 'Waren und Leistungen beschaffen',
  'Manage accounts payable': 'Kreditorenbuchhaltung verwalten',
  'Analyze procurement and sourcing': 'Einkauf und Sourcing analysieren',
}

/** Führende Verben → deutscher Infinitiv (ans Satzende gestellt). */
const VERB_DE: Record<string, string> = {
  'set up': 'einrichten',
  'sign off': 'freigeben',
  'follow up': 'nachfassen',
  'go live': 'live gehen',
  'phase out': 'auslaufen lassen',
  manage: 'verwalten',
  define: 'definieren',
  develop: 'entwickeln',
  analyze: 'analysieren',
  plan: 'planen',
  monitor: 'überwachen',
  configure: 'konfigurieren',
  identify: 'identifizieren',
  conduct: 'durchführen',
  process: 'abwickeln',
  record: 'erfassen',
  track: 'verfolgen',
  maintain: 'pflegen',
  create: 'erstellen',
  perform: 'durchführen',
  forecast: 'prognostizieren',
  implement: 'implementieren',
  measure: 'messen',
  report: 'berichten',
  issue: 'ausstellen',
  allocate: 'zuordnen',
  establish: 'etablieren',
  retire: 'ausmustern',
  correct: 'korrigieren',
  test: 'testen',
  update: 'aktualisieren',
  budget: 'budgetieren',
  schedule: 'planen',
  reconcile: 'abstimmen',
  prepare: 'vorbereiten',
  review: 'prüfen',
  onboard: 'einarbeiten',
  offboard: 'offboarden',
  evaluate: 'bewerten',
  audit: 'auditieren',
  design: 'entwerfen',
  source: 'beschaffen',
  revalue: 'neu bewerten',
  transfer: 'umlagern',
  scrap: 'verschrotten',
  adjust: 'anpassen',
  assess: 'bewerten',
  send: 'senden',
  use: 'nutzen',
  close: 'abschließen',
  acquire: 'beschaffen',
  dispose: 'entsorgen',
  execute: 'ausführen',
  run: 'ausführen',
  control: 'steuern',
  deliver: 'erbringen',
  procure: 'beschaffen',
  intake: 'aufnehmen',
  uptake: 'einspielen',
  support: 'unterstützen',
  train: 'schulen',
  administer: 'administrieren',
  introduce: 'einführen',
  recruit: 'rekrutieren',
  pursue: 'verfolgen',
  estimate: 'schätzen',
  research: 'erforschen',
  increase: 'steigern',
  pay: 'bezahlen',
  post: 'buchen',
  calculate: 'berechnen',
  generate: 'erzeugen',
  register: 'registrieren',
  release: 'freigeben',
  purchase: 'einkaufen',
  sell: 'verkaufen',
  ship: 'versenden',
  receive: 'empfangen',
  pick: 'kommissionieren',
  pack: 'verpacken',
  settle: 'ausgleichen',
  approve: 'genehmigen',
  qualify: 'qualifizieren',
  disqualify: 'disqualifizieren',
  finalize: 'finalisieren',
  eliminate: 'eliminieren',
  validate: 'validieren',
  store: 'speichern',
  archive: 'archivieren',
  find: 'finden',
  optimize: 'optimieren',
  mitigate: 'mindern',
  produce: 'produzieren',
  decommission: 'außer Betrieb nehmen',
  assign: 'zuweisen',
  print: 'drucken',
  search: 'suchen',
  aggregate: 'aggregieren',
  prototype: 'prototypisieren',
  rebalance: 'neu ausbalancieren',
  handle: 'bearbeiten',
  view: 'anzeigen',
  classify: 'klassifizieren',
  reallocate: 'neu zuordnen',
  install: 'installieren',
  commission: 'in Betrieb nehmen',
  depreciate: 'abschreiben',
  insure: 'versichern',
  improve: 'verbessern',
  replace: 'ersetzen',
  lease: 'leasen',
  reduce: 'reduzieren',
  collect: 'einziehen',
  determine: 'bestimmen',
  enrich: 'anreichern',
  synchronize: 'synchronisieren',
  detect: 'erkennen',
  reclaim: 'zurückgewinnen',
  purge: 'bereinigen',
  retry: 'wiederholen',
  deploy: 'bereitstellen',
  migrate: 'migrieren',
  respond: 'reagieren',
  troubleshoot: 'beheben',
  capture: 'erfassen',
  merge: 'zusammenführen',
  reopen: 'wieder öffnen',
  convert: 'umwandeln',
  oversee: 'überwachen',
  provide: 'bereitstellen',
  refine: 'verfeinern',
  renew: 'erneuern',
  revoke: 'entziehen',
  delete: 'löschen',
  enable: 'aktivieren',
  prioritize: 'priorisieren',
  engage: 'interagieren',
  swarm: 'gemeinsam bearbeiten',
  comply: 'einhalten',
  drive: 'steigern',
  take: 'erfassen',
  deprecate: 'abkündigen',
}

/** Objekt-Phrasen (nach dem Verb) → Deutsch. Für häufige Schritte. */
const OBJECT_DE: Record<string, string> = {
  'sales orders': 'Verkaufsaufträge',
  'sales order': 'Verkaufsauftrag',
  'purchase orders': 'Bestellungen',
  'purchase order': 'Bestellung',
  'purchase requisitions': 'Bestellanforderungen',
  'accounts receivable': 'Debitorenbuchhaltung',
  'accounts payable': 'Kreditorenbuchhaltung',
  'fixed assets': 'Anlagen',
  'fixed asset': 'Anlage',
  assets: 'Anlagen',
  asset: 'Anlage',
  inventory: 'Bestand',
  'inventory levels': 'Bestände',
  budgets: 'Budgets',
  budget: 'Budget',
  invoices: 'Rechnungen',
  invoice: 'Rechnung',
  payments: 'Zahlungen',
  payment: 'Zahlung',
  customers: 'Kunden',
  customer: 'Kunde',
  'customer relationships': 'Kundenbeziehungen',
  suppliers: 'Lieferanten',
  supplier: 'Lieferant',
  'supplier relationships': 'Lieferantenbeziehungen',
  vendors: 'Kreditoren',
  vendor: 'Kreditor',
  products: 'Produkte',
  product: 'Produkt',
  'product strategy': 'Produktstrategie',
  services: 'Services',
  service: 'Service',
  'service work': 'Servicearbeiten',
  'service offerings': 'Serviceangebote',
  cases: 'Fälle',
  case: 'Fall',
  leads: 'Leads',
  lead: 'Lead',
  opportunities: 'Verkaufschancen',
  opportunity: 'Verkaufschance',
  quotes: 'Angebote',
  quote: 'Angebot',
  quotations: 'Angebote',
  contracts: 'Verträge',
  contract: 'Vertrag',
  projects: 'Projekte',
  project: 'Projekt',
  'project delivery': 'Projektabwicklung',
  'project contracts': 'Projektverträge',
  'project financials': 'Projektfinanzen',
  'financial transactions': 'Finanztransaktionen',
  'financial performance': 'Finanzleistung',
  'financial periods': 'Perioden',
  'sales performance': 'Vertriebsleistung',
  'sales policies': 'Verkaufsrichtlinien',
  'accounting policies': 'Buchhaltungsrichtlinien',
  cash: 'Liquidität',
  data: 'Daten',
  'marketing campaigns': 'Marketingkampagnen',
  'marketing strategy': 'Marketingstrategie',
  'marketing operations': 'Marketingaktivitäten',
  'production operations': 'Produktion',
  'production quality': 'Produktionsqualität',
  'production strategies': 'Produktionsstrategien',
  'warehouse operations': 'Lagerbetrieb',
  'inbound goods': 'Wareneingang',
  'outbound goods': 'Warenausgang',
  'inventory quality': 'Bestandsqualität',
  'freight and transportation': 'Fracht und Transport',
  'credit and collections': 'Kredit und Mahnwesen',
  'goods and services': 'Waren und Leistungen',
  'people strategy': 'Personalstrategie',
  'business strategy': 'Geschäftsstrategie',
  'business performance': 'Geschäftsperformance',
  'business continuity plan': 'Business-Continuity-Plan',
  talent: 'Talente',
  'workplace compliance': 'Arbeitsplatz-Compliance',
  'performance and growth': 'Leistung und Entwicklung',
  'time and attendance': 'Zeit und Anwesenheit',
  'compensation and benefits': 'Vergütung und Benefits',
  'system access and security': 'Systemzugriff und Sicherheit',
  'system features': 'Systemfunktionen',
  'system compliance': 'System-Compliance',
  'background jobs': 'Hintergrundjobs',
  'software releases': 'Software-Releases',
  solutions: 'Lösungen',
  solution: 'Lösung',
  systems: 'Systeme',
  system: 'System',
  users: 'Anwender',
  user: 'Anwender',
  licenses: 'Lizenzen',
  license: 'Lizenz',
  'licensing and entitlements': 'Lizenzierung und Berechtigungen',
  employees: 'Mitarbeitende',
  employee: 'Mitarbeitende',
  workers: 'Beschäftigte',
  worker: 'Beschäftigte',
  costs: 'Kosten',
  cost: 'Kosten',
  prices: 'Preise',
  pricing: 'Preisgestaltung',
  demand: 'Bedarf',
  'demand forecasts': 'Bedarfsprognosen',
  materials: 'Materialien',
  material: 'Material',
  jobs: 'Aufträge',
  job: 'Auftrag',
  maintenance: 'Wartung',
  quality: 'Qualität',
  compliance: 'Compliance',
  risk: 'Risiko',
  risks: 'Risiken',
  requests: 'Anfragen',
  request: 'Anfrage',
  transactions: 'Transaktionen',
  transaction: 'Transaktion',
  orders: 'Aufträge',
  order: 'Auftrag',
  returns: 'Retouren',
  refunds: 'Erstattungen',
  prepayments: 'Anzahlungen',
  expenses: 'Ausgaben',
  revenue: 'Umsatz',
  reports: 'Berichte',
  report: 'Bericht',
  'knowledge base': 'Wissensdatenbank',
  training: 'Schulung',
  campaigns: 'Kampagnen',
  campaign: 'Kampagne',
  offerings: 'Angebote',
  performance: 'Leistung',
  strategy: 'Strategie',
  policies: 'Richtlinien',
  operations: 'Betrieb',
  'purchase agreements': 'Rahmenverträge',
  'sales agreements': 'Verkaufsvereinbarungen',
  'credit limits': 'Kreditlimits',
  'bank accounts': 'Bankkonten',
  'bank account': 'Bankkonto',
  taxes: 'Steuern',
  tax: 'Steuer',
  'chart of accounts': 'Kontenplan',
  workforce: 'Belegschaft',
  positions: 'Stellen',
  headcount: 'Personalbestand',
  shifts: 'Schichten',
  absences: 'Abwesenheiten',
  leave: 'Abwesenheit',
  benefits: 'Benefits',
  timesheets: 'Zeiterfassungen',
  spend: 'Ausgabenvolumen',
  procurement: 'Beschaffung',
  sourcing: 'Sourcing',
  storage: 'Lagerung',
  capacity: 'Kapazität',
  freight: 'Fracht',
  transportation: 'Transport',
  shipping: 'Versand',
  picking: 'Kommissionierung',
  releases: 'Releases',
  notifications: 'Benachrichtigungen',
  alerts: 'Warnungen',
  incidents: 'Vorfälle',
  approvals: 'Genehmigungen',
  'root cause': 'Ursache',
  'change requests': 'Änderungsanträge',
  // Assets / Leasing / Wartung
  'asset leases': 'Anlagenleasing',
  'asset lease': 'Anlagenleasing',
  'asset maintenance': 'Anlagenwartung',
  'asset performance': 'Anlagenperformance',
  'asset utilization': 'Anlagenauslastung',
  'asset inventory': 'Anlagenbestand',
  'asset budgets': 'Anlagenbudgets',
  'asset subledger': 'Anlagen-Nebenbuch',
  'asset accounting books': 'Anlagenbuchhaltung',
  'fixed asset acquisitions': 'Anlagenzugänge',
  'maintenance costs': 'Wartungskosten',
  'maintenance jobs': 'Wartungsaufträge',
  'maintenance strategy': 'Wartungsstrategie',
  'leasing policies': 'Leasingrichtlinien',
  'depreciation and amortization policies': 'Abschreibungs- und Amortisationsrichtlinien',
  // Implementierung / Plattform
  'cloud solutions': 'Cloud-Lösungen',
  'implementation strategy': 'Implementierungsstrategie',
  'solution blueprint': 'Lösungs-Blueprint',
  'process governance': 'Prozess-Governance',
  'environment strategy': 'Umgebungsstrategie',
  'security approach': 'Sicherheitskonzept',
  'usability strategy': 'Usability-Strategie',
  'testing approach': 'Testkonzept',
  'extensions approach': 'Erweiterungskonzept',
  'integration strategy': 'Integrationsstrategie',
  'performance strategy': 'Performance-Strategie',
  'organizational structure': 'Organisationsstruktur',
  // Business Continuity
  'business continuity objectives': 'Business-Continuity-Ziele',
  'business continuity risks': 'Business-Continuity-Risiken',
  'disaster recovery plan': 'Notfallwiederherstellungsplan',
  'recovery objectives': 'Wiederherstellungsziele',
  // System / Sicherheit / Lizenzen
  'file storage': 'Dateispeicher',
  'log storage': 'Log-Speicher',
  'storage capacity': 'Speicherkapazität',
  'database storage': 'Datenbankspeicher',
  'software licenses': 'Softwarelizenzen',
  'software licenses and add-ons': 'Softwarelizenzen und Add-ons',
  software: 'Software',
  'audit logs': 'Audit-Logs',
  'access policies': 'Zugriffsrichtlinien',
  'access to systems': 'Systemzugriff',
  'data security': 'Datensicherheit',
  authentication: 'Authentifizierung',
  encryption: 'Verschlüsselung',
  'segregation of duties': 'Funktionstrennung',
  'service accounts and certificates': 'Dienstkonten und Zertifikate',
  'signatures and signing limits': 'Signaturen und Signaturlimits',
  workflows: 'Workflows',
  emails: 'E-Mails',
  // Schulung
  'training strategy': 'Schulungsstrategie',
  'training needs': 'Schulungsbedarf',
  'training materials': 'Schulungsmaterialien',
  'training delivery': 'Schulungsdurchführung',
  'training program': 'Schulungsprogramm',
  // Benachrichtigungen
  'notification channels': 'Benachrichtigungskanäle',
  'notification recipients': 'Benachrichtigungsempfänger',
  'notification templates': 'Benachrichtigungsvorlagen',
  'notification triggers': 'Benachrichtigungsauslöser',
  // Releases / Support
  'support incidents': 'Support-Vorfälle',
  'support subscription': 'Support-Abonnement',
  'support transition strategy': 'Support-Übergangsstrategie',
  'root cause analysis': 'Ursachenanalyse',
  'knowledge base articles': 'Wissensdatenbank-Artikel',
  'call center performance': 'Callcenter-Performance',
  // Marketing / Produkt
  'value proposition': 'Wertversprechen',
  'brand kit': 'Brand-Kit',
  'market research': 'Marktforschung',
  research: 'Forschung',
  ideas: 'Ideen',
  prototypes: 'Prototypen',
  'target markets': 'Zielmärkte',
  'service pricing': 'Servicepreise',
  'campaign audiences': 'Kampagnen-Zielgruppen',
  'marketing material': 'Marketingmaterial',
  events: 'Events',
  'loyalty programs': 'Treueprogramme',
  'campaign expenses': 'Kampagnenausgaben',
  'marketing financials': 'Marketing-Finanzen',
  'campaign performance': 'Kampagnenleistung',
  'marketing trends': 'Marketingtrends',
  'competitive analysis': 'Wettbewerbsanalyse',
  'regulatory compliance': 'regulatorische Compliance',
  'product policies': 'Produktrichtlinien',
  'product portfolio': 'Produktportfolio',
  'product roadmap': 'Produkt-Roadmap',
  // Produktion / Projekt / Finanzen
  'production processes': 'Produktionsprozesse',
  'production plan': 'Produktionsplan',
  'production costs': 'Produktionskosten',
  'project scope': 'Projektumfang',
  'project resources': 'Projektressourcen',
  'project materials': 'Projektmaterialien',
  'financial statements': 'Finanzberichte',
  'service demand': 'Servicebedarf',
  'service assets': 'Serviceanlagen',
  'supplier performance': 'Lieferantenleistung',
  'bills of materials': 'Stücklisten',
  formulas: 'Rezepturen',
  'sales channels': 'Vertriebskanäle',
  'trade allowances': 'Handelsrabatte',
  'cash flow': 'Cashflow',
  issues: 'Probleme',
  support: 'Unterstützung',
  change: 'Veränderung',
  // System-Objekte (häufig in „Configure and manage X")
  devices: 'Geräte',
  apps: 'Apps',
  'mobile apps and devices': 'mobile Apps und Geräte',
  'store devices': 'Store-Geräte',
  'iot devices': 'IoT-Geräte',
  'office apps and add-ins': 'Office-Apps und Add-ins',
  portals: 'Portale',
  surveys: 'Umfragen',
  agents: 'Agenten',
  search: 'Suche',
  'copilot capabilities': 'Copilot-Funktionen',
  'reporting and analytics': 'Reporting und Analytics',
  'microsoft teams integrations': 'Microsoft-Teams-Integrationen',
  integrations: 'Integrationen',
  settings: 'Einstellungen',
  documents: 'Dokumente',
  regulations: 'Vorschriften',
  'new features': 'neue Funktionen',
  'new users': 'neue Anwender',
  'new products': 'neue Produkte',
  'new services': 'neue Services',
  'organizational change': 'organisatorische Veränderung',
}

/** Adjektive (in häufiger Plural-/„-e"-Form) für Objekt-Komposition. */
const ADJ_DE: Record<string, string> = {
  active: 'aktive',
  new: 'neue',
  common: 'häufige',
  similar: 'ähnliche',
  ongoing: 'laufende',
  critical: 'kritische',
  initial: 'anfängliche',
  recurring: 'wiederkehrende',
  financial: 'finanzielle',
  regulatory: 'regulatorische',
  organizational: 'organisatorische',
  corrective: 'korrektive',
  preventative: 'präventive',
  predictive: 'prädiktive',
  operational: 'operative',
  strategic: 'strategische',
  additional: 'zusätzliche',
}

/** Einzelwort-Fallback für sichere Komposition („X and Y"). */
const NOUN_DE: Record<string, string> = {
  assets: 'Anlagen',
  products: 'Produkte',
  services: 'Services',
  goods: 'Waren',
  orders: 'Aufträge',
  invoices: 'Rechnungen',
  payments: 'Zahlungen',
  budgets: 'Budgets',
  customers: 'Kunden',
  suppliers: 'Lieferanten',
  leads: 'Leads',
  opportunities: 'Verkaufschancen',
  quotes: 'Angebote',
  contracts: 'Verträge',
  projects: 'Projekte',
  cases: 'Fälle',
  leases: 'Leasingverträge',
  collections: 'Mahnwesen',
  credit: 'Kredit',
  performance: 'Leistung',
  growth: 'Entwicklung',
  attendance: 'Anwesenheit',
  time: 'Zeit',
  compensation: 'Vergütung',
  benefits: 'Benefits',
  security: 'Sicherheit',
  access: 'Zugriff',
  transportation: 'Transport',
  freight: 'Fracht',
}

/** Mehrwort-Verben zuerst prüfen. */
const VERB_KEYS = Object.keys(VERB_DE).sort((a, b) => b.length - a.length)

function lc(s: string): string {
  return s.trim().toLowerCase()
}

/** Deutsche Verbliste zu „a, b und c" verbinden. */
function joinVerbs(verbs: string[], conj: 'und' | 'oder'): string {
  if (verbs.length <= 1) return verbs.join('')
  return verbs.slice(0, -1).join(', ') + ` ${conj} ` + verbs[verbs.length - 1]
}

function translateObject(obj: string): string | null {
  const key = lc(obj)
  if (OBJECT_DE[key]) return OBJECT_DE[key]
  // „X and Y" / „X or Y" zusammensetzen, wenn beide Teile bekannt sind
  const conj = key.includes(' and ') ? ' and ' : key.includes(' or ') ? ' or ' : ''
  if (conj) {
    const parts = key.split(conj).map((p) => p.trim())
    const de = parts.map((p) => OBJECT_DE[p] || NOUN_DE[p] || null)
    if (de.every(Boolean)) return de.join(conj === ' and ' ? ' und ' : ' oder ')
  }
  // Adjektiv + Objekt („active products" → „aktive Produkte")
  const sp = key.indexOf(' ')
  if (sp > 0) {
    const adj = key.slice(0, sp)
    if (ADJ_DE[adj]) {
      const head = translateObject(key.slice(sp + 1))
      if (head) return `${ADJ_DE[adj]} ${head}`
    }
  }
  if (NOUN_DE[key]) return NOUN_DE[key]
  return null
}

/** Führende Verbfolge parsen: „Configure and manage X" / „Test, validate, and update X". */
function parseLeadingVerbs(
  raw: string,
): { verbsDe: string[]; conj: 'und' | 'oder'; rest: string } | null {
  const tokens = raw.split(/\s+/)
  const verbsDe: string[] = []
  let conj: 'und' | 'oder' = 'und'
  let i = 0
  let expectVerb = true
  while (i < tokens.length) {
    const bare = tokens[i].replace(/[.,]/g, '').toLowerCase()
    if (expectVerb) {
      if (bare === 'and') { i++; continue }
      if (bare === 'or') { conj = 'oder'; i++; continue }
      if (VERB_DE[bare]) {
        verbsDe.push(VERB_DE[bare])
        expectVerb = /,$/.test(tokens[i]) // Komma => weitere Verben folgen
        i++
        continue
      }
      break
    } else {
      if (bare === 'and') { expectVerb = true; i++; continue }
      if (bare === 'or') { conj = 'oder'; expectVerb = true; i++; continue }
      break
    }
  }
  if (verbsDe.length === 0) return null
  const rest = tokens.slice(i).join(' ').replace(/^(of|the|a|an)\s+/i, '').trim()
  return { verbsDe, conj, rest }
}

/**
 * Übersetzt einen MBPC-Titel ins Deutsche.
 * @returns { de, ok } – ok=false bedeutet: kein Treffer, `de` = englischer Fallback.
 */
export function translateMbpcTitle(en: string): { de: string; ok: boolean } {
  const raw = en.trim()
  if (!raw) return { de: raw, ok: false }
  if (E2E_DE[raw]) return { de: E2E_DE[raw], ok: true }
  if (PHRASE_DE[raw]) return { de: PHRASE_DE[raw], ok: true }

  // Mehrwort-Verb am Anfang („Set up X")
  const lower = lc(raw)
  for (const v of VERB_KEYS) {
    if (!v.includes(' ')) continue
    if (lower === v) return { de: VERB_DE[v], ok: true }
    if (lower.startsWith(v + ' ')) {
      const rest = raw.slice(v.length + 1).replace(/^(of|the|a|an)\s+/i, '').trim()
      const obj = translateObject(rest)
      if (obj) return { de: `${obj} ${VERB_DE[v]}`, ok: true }
    }
  }

  // Verbfolge + Objekt („Configure and manage file storage")
  const parsed = parseLeadingVerbs(raw)
  if (parsed) {
    if (!parsed.rest) return { de: joinVerbs(parsed.verbsDe, parsed.conj), ok: true }
    const obj = translateObject(parsed.rest)
    if (obj) return { de: `${obj} ${joinVerbs(parsed.verbsDe, parsed.conj)}`, ok: true }
  }

  // Reine Objekt-Phrase ohne Verb
  const obj = translateObject(raw)
  if (obj) return { de: obj, ok: true }

  return { de: raw, ok: false }
}
