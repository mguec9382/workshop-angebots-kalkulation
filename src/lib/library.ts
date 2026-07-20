import type { ProjectState } from '../types'

/**
 * IndexedDB-Persistenz für die Projekt-Bibliothek (mehrere Interessenten)
 * und die Versions-Historie (Snapshots von Scope & Angebotskalkulation).
 * Der aktive Arbeitsstand wird zusätzlich als localStorage-Cache gehalten
 * (schneller Boot); IndexedDB ist die maßgebliche Ablage.
 */

const DB_NAME = 'cc-workshop-db'
const DB_VERSION = 1
const STORE_PROJECTS = 'projects'
const STORE_VERSIONS = 'versions'

export interface ProjectMeta {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ProjectRecord extends ProjectMeta {
  state: ProjectState
}

export interface VersionKpis {
  serviceDays: number
  serviceCost: number
  licenseMonthly: number
  totalPeriod: number
  inScope: number
}

export interface VersionMeta {
  id: string
  projectId: string
  label: string
  note: string
  createdAt: string
  kpis: VersionKpis
}

export interface ProjectVersion extends VersionMeta {
  snapshot: ProjectState
}

export function idbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
        const vs = db.createObjectStore(STORE_VERSIONS, { keyPath: 'id' })
        vs.createIndex('projectId', 'projectId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

/* ---------- Projekte ---------- */

export async function listProjects(): Promise<ProjectMeta[]> {
  const all = await tx<ProjectRecord[]>(STORE_PROJECTS, 'readonly', (s) => s.getAll() as IDBRequest<ProjectRecord[]>)
  return all
    .map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function getProject(id: string): Promise<ProjectRecord | undefined> {
  return tx<ProjectRecord | undefined>(STORE_PROJECTS, 'readonly', (s) => s.get(id) as IDBRequest<ProjectRecord | undefined>)
}

export async function putProject(rec: ProjectRecord): Promise<void> {
  await tx(STORE_PROJECTS, 'readwrite', (s) => s.put(rec))
}

export async function deleteProject(id: string): Promise<void> {
  await tx(STORE_PROJECTS, 'readwrite', (s) => s.delete(id))
  // zugehörige Versionen entfernen
  const versions = await listVersions(id)
  await Promise.all(versions.map((v) => deleteVersion(v.id)))
}

/* ---------- Versionen ---------- */

export async function listVersions(projectId: string): Promise<VersionMeta[]> {
  const all = await openDb().then(
    (db) =>
      new Promise<ProjectVersion[]>((resolve, reject) => {
        const t = db.transaction(STORE_VERSIONS, 'readonly')
        const idx = t.objectStore(STORE_VERSIONS).index('projectId')
        const req = idx.getAll(projectId) as IDBRequest<ProjectVersion[]>
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
  return all
    .map(({ id, projectId: pid, label, note, createdAt, kpis }) => ({ id, projectId: pid, label, note, createdAt, kpis }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getVersion(id: string): Promise<ProjectVersion | undefined> {
  return tx<ProjectVersion | undefined>(STORE_VERSIONS, 'readonly', (s) => s.get(id) as IDBRequest<ProjectVersion | undefined>)
}

export async function putVersion(v: ProjectVersion): Promise<void> {
  await tx(STORE_VERSIONS, 'readwrite', (s) => s.put(v))
}

export async function deleteVersion(id: string): Promise<void> {
  await tx(STORE_VERSIONS, 'readwrite', (s) => s.delete(id))
}
