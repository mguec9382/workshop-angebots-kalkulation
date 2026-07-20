import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ProjectState } from '../types'
import { emptyProject, pharmaExample } from '../data/seed'
import { calculate } from './calc'
import {
  deleteProject as idbDeleteProject,
  deleteVersion as idbDeleteVersion,
  getProject,
  getVersion,
  idbAvailable,
  listProjects,
  listVersions,
  putProject,
  putVersion,
  type ProjectMeta,
  type ProjectVersion,
  type VersionMeta,
} from './library'

const STORAGE_KEY = 'cc-workshop-kalkulation-v2'
const CURRENT_ID_KEY = 'cc-current-project-id'

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    /* ignore */
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function deriveName(s: ProjectState): string {
  return s.prospect?.company?.trim() || 'Neuer Interessent'
}

function isValid(s: unknown): s is ProjectState {
  const p = s as ProjectState
  return (
    !!p &&
    Array.isArray(p.environments) &&
    p.environments.length > 0 &&
    p.environments.every((e) => !!e && !!e.scope && Array.isArray(e.licenses)) &&
    typeof p.activeEnvironmentId === 'string'
  )
}

function load(): ProjectState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ProjectState
      if (isValid(parsed)) return parsed
    }
  } catch {
    /* localStorage nicht verfügbar */
  }
  // Erststart / veraltetes Schema: Pharma-Beispiel laden
  return pharmaExample()
}

interface StoreContextValue {
  state: ProjectState
  /** Immutabler Update per Producer-Funktion */
  update: (fn: (draft: ProjectState) => void) => void
  replace: (next: ProjectState) => void
  reset: () => void
  loadExample: () => void
  dirty: boolean
  markSaved: () => void
  /* ---- Projekt-Bibliothek ---- */
  currentProjectId: string
  projects: ProjectMeta[]
  newProject: () => void
  switchProject: (id: string) => void
  duplicateProject: (id: string) => void
  deleteProject: (id: string) => void
  /* ---- Versionierung ---- */
  versions: VersionMeta[]
  saveVersion: (label: string, note: string) => Promise<void>
  restoreVersion: (id: string) => Promise<void>
  deleteVersion: (id: string) => Promise<void>
  loadVersionSnapshot: (id: string) => Promise<ProjectState | null>
}

const StoreContext = createContext<StoreContextValue | null>(null)

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProjectState>(() => load())
  const [dirty, setDirty] = useState(false)
  const savedRef = useRef<string>(JSON.stringify(state))

  const [currentProjectId, setCurrentProjectId] = useState<string>(
    () => localStorage.getItem(CURRENT_ID_KEY) || '',
  )
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const currentIdRef = useRef(currentProjectId)
  currentIdRef.current = currentProjectId

  const refreshProjects = useCallback(async () => {
    if (!idbAvailable()) return
    try {
      setProjects(await listProjects())
    } catch {
      /* ignore */
    }
  }, [])

  const refreshVersions = useCallback(async (projectId: string) => {
    if (!idbAvailable() || !projectId) return
    try {
      setVersions(await listVersions(projectId))
    } catch {
      /* ignore */
    }
  }, [])

  // Einmalige Initialisierung der Bibliothek (Migration bestehendes Projekt)
  useEffect(() => {
    if (!idbAvailable()) return
    let cancelled = false
    // ID deterministisch festlegen, bevor asynchron geschrieben wird
    // (verhindert Doppel-Migration im React-StrictMode / bei Races)
    let id = localStorage.getItem(CURRENT_ID_KEY) || ''
    if (!id) {
      id = newId()
      localStorage.setItem(CURRENT_ID_KEY, id)
    }
    ;(async () => {
      try {
        const existing = await listProjects()
        if (existing.length === 0) {
          // Migration: aktuellen Arbeitsstand als erstes Projekt übernehmen
          const now = new Date().toISOString()
          await putProject({ id, name: deriveName(state), createdAt: now, updatedAt: now, state })
          if (cancelled) return
          setCurrentProjectId(id)
          setProjects(await listProjects())
          await refreshVersions(id)
        } else {
          if (!existing.some((p) => p.id === id)) id = existing[0].id
          localStorage.setItem(CURRENT_ID_KEY, id)
          if (cancelled) return
          setCurrentProjectId(id)
          setProjects(existing)
          // aktives Projekt aus der Bibliothek laden (falls anderes als Cache)
          const rec = await getProject(id)
          if (rec && !cancelled) {
            setState(rec.state)
            savedRef.current = JSON.stringify(rec.state)
          }
          await refreshVersions(id)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-Persist: localStorage-Cache (sofort) + IndexedDB (debounced)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    try {
      const serialized = JSON.stringify(state)
      localStorage.setItem(STORAGE_KEY, serialized)
      setDirty(serialized !== savedRef.current)
    } catch {
      /* ignore */
    }
    if (!idbAvailable()) return
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(async () => {
      const id = currentIdRef.current
      if (!id) return
      try {
        const rec = await getProject(id)
        const createdAt = rec?.createdAt || new Date().toISOString()
        await putProject({
          id,
          name: deriveName(state),
          createdAt,
          updatedAt: new Date().toISOString(),
          state,
        })
        await refreshProjects()
      } catch {
        /* ignore */
      }
    }, 600)
  }, [state, refreshProjects])

  const update = useCallback((fn: (draft: ProjectState) => void) => {
    setState((prev) => {
      const draft = clone(prev)
      fn(draft)
      draft.updatedAt = new Date().toISOString()
      return draft
    })
  }, [])

  const replace = useCallback((next: ProjectState) => {
    setState(next)
    savedRef.current = JSON.stringify(next)
    setDirty(false)
  }, [])

  const reset = useCallback(() => {
    replace(emptyProject())
  }, [replace])

  const loadExample = useCallback(() => {
    replace(pharmaExample())
  }, [replace])

  const markSaved = useCallback(() => {
    savedRef.current = JSON.stringify(state)
    setDirty(false)
  }, [state])

  /* ---------- Projekt-Bibliothek ---------- */

  const persistNow = useCallback(async (id: string, next: ProjectState) => {
    const rec = await getProject(id)
    const now = new Date().toISOString()
    await putProject({
      id,
      name: deriveName(next),
      createdAt: rec?.createdAt || now,
      updatedAt: now,
      state: next,
    })
  }, [])

  const newProject = useCallback(async () => {
    const fresh = emptyProject()
    const id = newId()
    replace(fresh)
    if (idbAvailable()) {
      await persistNow(id, fresh)
    }
    localStorage.setItem(CURRENT_ID_KEY, id)
    setCurrentProjectId(id)
    setVersions([])
    await refreshProjects()
  }, [replace, persistNow, refreshProjects])

  const switchProject = useCallback(
    async (id: string) => {
      if (!idbAvailable()) return
      const rec = await getProject(id)
      if (!rec) return
      replace(rec.state)
      localStorage.setItem(CURRENT_ID_KEY, id)
      setCurrentProjectId(id)
      await refreshVersions(id)
    },
    [replace, refreshVersions],
  )

  const duplicateProject = useCallback(
    async (id: string) => {
      if (!idbAvailable()) return
      const rec = await getProject(id)
      if (!rec) return
      const copy = clone(rec.state)
      copy.prospect.company = `${deriveName(rec.state)} (Kopie)`
      const newProjectId = newId()
      replace(copy)
      await persistNow(newProjectId, copy)
      localStorage.setItem(CURRENT_ID_KEY, newProjectId)
      setCurrentProjectId(newProjectId)
      setVersions([])
      await refreshProjects()
    },
    [replace, persistNow, refreshProjects],
  )

  const deleteProject = useCallback(
    async (id: string) => {
      if (!idbAvailable()) return
      await idbDeleteProject(id)
      const remaining = await listProjects()
      if (remaining.length === 0) {
        // letztes Projekt gelöscht → frisches anlegen
        const fresh = emptyProject()
        const freshId = newId()
        replace(fresh)
        await persistNow(freshId, fresh)
        localStorage.setItem(CURRENT_ID_KEY, freshId)
        setCurrentProjectId(freshId)
        setVersions([])
        await refreshProjects()
        return
      }
      setProjects(remaining)
      if (id === currentIdRef.current) {
        await switchProject(remaining[0].id)
      }
    },
    [replace, persistNow, refreshProjects, switchProject],
  )

  /* ---------- Versionierung ---------- */

  const computeKpis = useCallback((s: ProjectState) => {
    const c = calculate(s)
    return {
      serviceDays: c.serviceDays,
      serviceCost: c.serviceCostOneTime,
      licenseMonthly: c.licenseMonthly,
      totalPeriod: c.totalPeriod,
      inScope: c.scopeStats.in,
    }
  }, [])

  const saveVersion = useCallback(
    async (label: string, note: string) => {
      if (!idbAvailable()) return
      const id = currentIdRef.current
      if (!id) return
      // aktuellen Stand zunächst sichern
      await persistNow(id, state)
      const version: ProjectVersion = {
        id: newId(),
        projectId: id,
        label: label.trim() || new Date().toLocaleString('de-DE'),
        note: note.trim(),
        createdAt: new Date().toISOString(),
        kpis: computeKpis(state),
        snapshot: clone(state),
      }
      await putVersion(version)
      await refreshVersions(id)
      markSaved()
    },
    [state, persistNow, computeKpis, refreshVersions, markSaved],
  )

  const restoreVersion = useCallback(
    async (id: string) => {
      if (!idbAvailable()) return
      const v = await getVersion(id)
      if (!v) return
      const projectId = currentIdRef.current
      // Sicherheit: aktuellen Stand automatisch als Version sichern
      if (projectId) {
        const auto: ProjectVersion = {
          id: newId(),
          projectId,
          label: `Auto-Sicherung ${new Date().toLocaleString('de-DE')}`,
          note: '',
          createdAt: new Date().toISOString(),
          kpis: computeKpis(state),
          snapshot: clone(state),
        }
        await putVersion(auto)
      }
      const restored = clone(v.snapshot)
      replace(restored)
      if (projectId) {
        await persistNow(projectId, restored)
        await refreshVersions(projectId)
      }
    },
    [state, replace, persistNow, computeKpis, refreshVersions],
  )

  const deleteVersion = useCallback(
    async (id: string) => {
      if (!idbAvailable()) return
      await idbDeleteVersion(id)
      await refreshVersions(currentIdRef.current)
    },
    [refreshVersions],
  )

  const loadVersionSnapshot = useCallback(async (id: string): Promise<ProjectState | null> => {
    if (!idbAvailable()) return null
    const v = await getVersion(id)
    return v ? v.snapshot : null
  }, [])

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      update,
      replace,
      reset,
      loadExample,
      dirty,
      markSaved,
      currentProjectId,
      projects,
      newProject,
      switchProject,
      duplicateProject,
      deleteProject,
      versions,
      saveVersion,
      restoreVersion,
      deleteVersion,
      loadVersionSnapshot,
    }),
    [
      state,
      update,
      replace,
      reset,
      loadExample,
      dirty,
      markSaved,
      currentProjectId,
      projects,
      newProject,
      switchProject,
      duplicateProject,
      deleteProject,
      versions,
      saveVersion,
      restoreVersion,
      deleteVersion,
      loadVersionSnapshot,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore muss innerhalb von StoreProvider verwendet werden')
  return ctx
}
