import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getBrowserLanguages,
  getDefaultPreferences,
  loadPreferences,
  preferenceDraftSchema,
  resolveLanguage,
  savePreferences,
  userPreferencesSchema,
  type PreferenceField,
  type PreferenceLoadResult,
  type PreferencePersistenceStatus,
  type PreferenceStorageDependencies,
  type PreferenceWriteIntent,
  type RevisionBaseline,
  type UserPreferences,
} from '@/entities/preferences'
import { getTimeZone as readTimeZone } from '@/shared/lib/dateTimeFormat'
import { applyLanguage } from '@/shared/i18n'
import {
  isDraftDirty,
  toDraft,
  draftToPreferences,
  type PreferenceDraft,
} from './preferencesDraft'
import {
  locationCandidateSchema,
  selectLocationCandidate,
  validateLocationQuery,
  type LocationCandidate,
  type LocationResolutionErrorCode,
  type LocationResolver,
} from './locationResolver'

export interface PreferencesStoreDependencies extends PreferenceStorageDependencies {
  resolver?: LocationResolver
  timeZone?: string
}

export type PreferenceNoticeKind =
  'success' | 'session-only' | 'conflict' | 'error' | 'info'

export interface PreferenceNotice {
  kind: PreferenceNoticeKind
  messageKey: string
}

export type SaveOutcome =
  | 'saved'
  | 'session-only'
  | 'conflict'
  | 'blocked'
  | 'invalid'
  | 'pending'
  | 'confirm-required'

export type LocationSearchStatus =
  | { status: 'idle'; candidates: LocationCandidate[] }
  | { status: 'loading'; candidates: [] }
  | { status: 'empty'; candidates: [] }
  | {
      status: 'error'
      code: LocationResolutionErrorCode
      candidates: []
    }

export interface PreferenceDraftErrors {
  locationQuery?: string
  weatherLocation?: string
}

interface PreferencesState {
  applied: UserPreferences
  draft: PreferenceDraft
  baseline: RevisionBaseline
  persistence: PreferencePersistenceStatus
  pending: boolean
  notice: PreferenceNotice | null
  externalChange: boolean
  localDraft: boolean
  dialogOpen: boolean
  replacePromptOpen: boolean
  errors: PreferenceDraftErrors
  locationStatus: LocationSearchStatus
}

function fieldsFromLoad(result: PreferenceLoadResult): PreferenceField[] {
  if (result.kind === 'partial') {
    return [
      ...new Set([
        ...result.invalidFields,
        ...(result.notRestoredFields ?? []),
      ]),
    ]
  }
  return []
}

function initialState(
  deps: PreferencesStoreDependencies | undefined,
): PreferencesState {
  const loaded = loadPreferences(deps)
  const defaults = getDefaultPreferences()

  switch (loaded.kind) {
    case 'empty':
      return {
        applied: defaults,
        draft: toDraft(defaults),
        baseline: { revision: 'unknown' },
        persistence: { mode: 'normal' },
        pending: false,
        notice: null,
        externalChange: false,
        localDraft: false,
        dialogOpen: false,
        replacePromptOpen: false,
        errors: {},
        locationStatus: { status: 'idle', candidates: [] },
      }
    case 'restored':
      return {
        applied: loaded.preferences,
        draft: toDraft(loaded.preferences),
        baseline: loaded.revision
          ? { revision: loaded.revision }
          : { revision: 'unknown' },
        persistence: { mode: 'normal' },
        pending: false,
        notice:
          loaded.migratedFrom !== undefined
            ? { kind: 'info', messageKey: 'feedback.restoredMigrated' }
            : null,
        externalChange: false,
        localDraft: false,
        dialogOpen: false,
        replacePromptOpen: false,
        errors: {},
        locationStatus: { status: 'idle', candidates: [] },
      }
    case 'partial': {
      const fields = fieldsFromLoad(loaded)
      return {
        applied: loaded.preferences,
        draft: toDraft(loaded.preferences),
        baseline: loaded.revision
          ? { revision: loaded.revision }
          : { revision: 'unknown' },
        persistence: { mode: 'recovery-blocked', fields },
        pending: false,
        notice: { kind: 'info', messageKey: 'feedback.restoredPartial' },
        externalChange: false,
        localDraft: false,
        dialogOpen: false,
        replacePromptOpen: false,
        errors: {},
        locationStatus: { status: 'idle', candidates: [] },
      }
    }
    case 'corrupt':
      return {
        applied: defaults,
        draft: toDraft(defaults),
        baseline: { revision: 'unknown' },
        persistence: { mode: 'protected', reason: 'corrupt' },
        pending: false,
        notice: { kind: 'error', messageKey: 'storage.corruptHeading' },
        externalChange: false,
        localDraft: false,
        dialogOpen: false,
        replacePromptOpen: false,
        errors: {},
        locationStatus: { status: 'idle', candidates: [] },
      }
    case 'migration-failed':
      return {
        applied: defaults,
        draft: toDraft(defaults),
        baseline: { revision: 'unknown' },
        persistence: { mode: 'protected', reason: 'migration-failed' },
        pending: false,
        notice: { kind: 'error', messageKey: 'storage.migrationFailedHeading' },
        externalChange: false,
        localDraft: false,
        dialogOpen: false,
        replacePromptOpen: false,
        errors: {},
        locationStatus: { status: 'idle', candidates: [] },
      }
    case 'unsupported':
      return {
        applied: defaults,
        draft: toDraft(defaults),
        baseline: { revision: 'unknown' },
        persistence: {
          mode: 'unsupported',
          detectedVersion: loaded.detectedVersion,
        },
        pending: false,
        notice: { kind: 'error', messageKey: 'storage.unsupportedHeading' },
        externalChange: false,
        localDraft: false,
        dialogOpen: false,
        replacePromptOpen: false,
        errors: {},
        locationStatus: { status: 'idle', candidates: [] },
      }
    case 'unavailable':
      return {
        applied: defaults,
        draft: toDraft(defaults),
        baseline: { revision: 'unknown' },
        persistence: { mode: 'session-only', reason: 'unavailable' },
        pending: false,
        notice: {
          kind: 'session-only',
          messageKey: 'storage.unavailableHeading',
        },
        externalChange: false,
        localDraft: false,
        dialogOpen: false,
        replacePromptOpen: false,
        errors: {},
        locationStatus: { status: 'idle', candidates: [] },
      }
  }
}

function persistenceFromWriteError(code: string): PreferencePersistenceStatus {
  switch (code) {
    case 'STORAGE_QUOTA_EXCEEDED':
      return { mode: 'session-only', reason: 'quota' }
    case 'STORAGE_UNAVAILABLE':
      return { mode: 'session-only', reason: 'unavailable' }
    default:
      return { mode: 'session-only', reason: 'write-failed' }
  }
}

function blockedStatus(cause: string | undefined): PreferencePersistenceStatus {
  switch (cause) {
    case 'unsupported':
      return { mode: 'unsupported', detectedVersion: 1 }
    case 'corrupt':
    case 'migration-failed':
      return { mode: 'protected', reason: cause }
    case 'partial':
      return { mode: 'recovery-blocked', fields: [] }
    default:
      return { mode: 'conflict' }
  }
}

export function usePreferencesStore(deps?: PreferencesStoreDependencies) {
  const depsRef = useRef(deps)
  useEffect(() => {
    depsRef.current = deps
  })
  const browserLanguages = useMemo(
    () => deps?.browserLanguages ?? getBrowserLanguages(),
    [deps?.browserLanguages],
  )
  const [timeZone, setTimeZone] = useState(
    () => deps?.timeZone ?? readTimeZone(),
  )

  useEffect(() => {
    if (deps?.timeZone) return
    const refreshTimeZone = () => setTimeZone(readTimeZone())
    window.addEventListener('focus', refreshTimeZone)
    document.addEventListener('visibilitychange', refreshTimeZone)
    return () => {
      window.removeEventListener('focus', refreshTimeZone)
      document.removeEventListener('visibilitychange', refreshTimeZone)
    }
  }, [deps?.timeZone])
  const resolver = deps?.resolver

  const [state, setState] = useState<PreferencesState>(() => initialState(deps))
  const stateRef = useRef(state)

  const commit = useCallback((next: PreferencesState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const resolution = useMemo(
    () => resolveLanguage(state.applied.language, browserLanguages),
    [state.applied.language, browserLanguages],
  )

  const dirty = useMemo(
    () => isDraftDirty(state.draft, state.applied),
    [state.draft, state.applied],
  )

  const applyDraft = useCallback(
    (patch: Partial<PreferenceDraft>) => {
      const before = stateRef.current
      const nextDraft = { ...before.draft, ...patch }
      commit({
        ...before,
        draft: nextDraft,
        localDraft: isDraftDirty(nextDraft, before.applied),
        errors: {},
      })
    },
    [commit],
  )

  const setLanguage = useCallback(
    (language: PreferenceDraft['language']) => {
      applyDraft({ language })
    },
    [applyDraft],
  )

  const setDateTimePresentation = useCallback(
    (dateTimePresentation: PreferenceDraft['dateTimePresentation']) => {
      applyDraft({ dateTimePresentation })
    },
    [applyDraft],
  )

  const setWeatherUnits = useCallback(
    (weatherUnits: PreferenceDraft['weatherUnits']) => {
      applyDraft({ weatherUnits })
    },
    [applyDraft],
  )

  const setLocationQuery = useCallback(
    (locationQuery: string) => {
      const before = stateRef.current
      commit({
        ...before,
        draft: { ...before.draft, locationQuery },
        errors: {},
        locationStatus: { status: 'idle', candidates: [] },
      })
    },
    [commit],
  )

  async function searchLocations(): Promise<void> {
    const before = stateRef.current
    const query = before.draft.locationQuery.trim()
    if (!validateLocationQuery(query)) {
      commit({
        ...before,
        errors: { locationQuery: 'validation.locationQueryInvalid' },
        locationStatus: { status: 'idle', candidates: [] },
      })
      return
    }

    if (!resolver) {
      commit({
        ...before,
        locationStatus: {
          status: 'error',
          code: 'LOCATION_SERVICE_UNAVAILABLE',
          candidates: [],
        },
      })
      return
    }

    commit({
      ...before,
      errors: {},
      locationStatus: { status: 'loading', candidates: [] },
    })

    const result = await resolver.resolve(query, {
      language: resolution.language,
    })
    const current = stateRef.current

    if (!result.ok) {
      commit({
        ...current,
        locationStatus: {
          status: 'error',
          code: result.code,
          candidates: [],
        },
      })
      return
    }

    const candidates = result.candidates.filter(
      (candidate) => locationCandidateSchema.safeParse(candidate).success,
    )

    commit({
      ...current,
      locationStatus:
        candidates.length === 0
          ? { status: 'empty', candidates: [] }
          : { status: 'idle', candidates },
    })
  }

  function selectLocation(candidate: LocationCandidate): boolean {
    const before = stateRef.current
    const location = selectLocationCandidate(
      candidate,
      resolution.formattingLocale,
    )
    if (!location) {
      commit({
        ...before,
        errors: { weatherLocation: 'validation.locationLabelInvalid' },
      })
      return false
    }

    const nextDraft = {
      ...before.draft,
      weatherLocation: location,
    }
    commit({
      ...before,
      draft: nextDraft,
      localDraft: isDraftDirty(nextDraft, before.applied),
      errors: {},
    })
    return true
  }

  function clearLocation(): void {
    applyDraft({ weatherLocation: null })
  }

  function cancelDraft(): void {
    const before = stateRef.current
    const draft = toDraft(before.applied)
    commit({
      ...before,
      draft,
      localDraft: false,
      errors: {},
      locationStatus: { status: 'idle', candidates: [] },
    })
  }

  const validateDraft = useCallback((): PreferenceDraftErrors => {
    const result = preferenceDraftSchema.safeParse(stateRef.current.draft)
    if (result.success) return {}

    const errors: PreferenceDraftErrors = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0]
      if (field === 'locationQuery') {
        errors.locationQuery = 'validation.locationQueryInvalid'
      } else if (field === 'weatherLocation') {
        errors.weatherLocation = 'validation.locationLabelInvalid'
      }
    }
    return errors
  }, [])

  async function performSave(
    preferences: UserPreferences,
    intent: PreferenceWriteIntent,
    keepDraft: boolean,
  ): Promise<SaveOutcome> {
    const before = stateRef.current
    if (before.pending) return 'pending'

    const validation = userPreferencesSchema.safeParse(preferences)
    if (!validation.success) {
      commit({ ...before, errors: validateDraft() })
      return 'invalid'
    }

    commit({ ...before, pending: true, notice: null })

    const result = await savePreferences(
      validation.data,
      before.baseline,
      intent,
      depsRef.current,
    )
    const current = stateRef.current

    if (result.ok) {
      commit({
        ...current,
        applied: validation.data,
        draft: keepDraft ? current.draft : toDraft(validation.data),
        baseline: { revision: result.revision },
        persistence: { mode: 'normal' },
        pending: false,
        externalChange: false,
        localDraft: false,
        errors: {},
        notice: { kind: 'success', messageKey: 'feedback.saved' },
      })
      return 'saved'
    }

    if (result.code === 'STORAGE_CONFLICT') {
      commit({
        ...current,
        pending: false,
        externalChange: true,
        persistence: { mode: 'conflict' },
        notice: { kind: 'conflict', messageKey: 'feedback.conflict' },
      })
      return 'conflict'
    }

    if (result.code === 'STORAGE_WRITE_BLOCKED') {
      commit({
        ...current,
        pending: false,
        persistence: blockedStatus(result.cause),
        notice: { kind: 'error', messageKey: 'storage.replaceHeading' },
      })
      return 'blocked'
    }

    commit({
      ...current,
      applied: validation.data,
      pending: false,
      persistence: persistenceFromWriteError(result.code),
      notice: {
        kind: 'session-only',
        messageKey: 'feedback.sessionOnly',
      },
    })
    return 'session-only'
  }

  async function requestSave(): Promise<SaveOutcome> {
    const before = stateRef.current
    if (before.pending) return 'pending'

    const errors = validateDraft()
    if (Object.keys(errors).length > 0) {
      commit({
        ...before,
        errors,
        notice: { kind: 'error', messageKey: 'validation.summaryHeading' },
      })
      return 'invalid'
    }

    if (
      !isDraftDirty(before.draft, before.applied) &&
      before.persistence.mode === 'normal'
    ) {
      return 'saved'
    }

    if (
      before.persistence.mode === 'protected' ||
      before.persistence.mode === 'recovery-blocked' ||
      before.persistence.mode === 'unsupported'
    ) {
      commit({
        ...before,
        replacePromptOpen: true,
        dialogOpen: true,
        localDraft: isDraftDirty(before.draft, before.applied),
      })
      return 'confirm-required'
    }

    if (before.externalChange || before.persistence.mode === 'conflict') {
      commit({
        ...before,
        notice: { kind: 'conflict', messageKey: 'feedback.conflict' },
      })
      return 'conflict'
    }

    return performSave(draftToPreferences(before.draft), 'automatic', false)
  }

  async function confirmReplace(): Promise<SaveOutcome> {
    const before = stateRef.current
    commit({
      ...before,
      replacePromptOpen: false,
      dialogOpen: false,
    })
    return performSave(
      draftToPreferences(stateRef.current.draft),
      'replace-unreadable',
      false,
    )
  }

  function cancelReplace(): void {
    const before = stateRef.current
    commit({ ...before, replacePromptOpen: false, dialogOpen: false })
  }

  function requestReplace(): void {
    const before = stateRef.current
    commit({ ...before, replacePromptOpen: true, dialogOpen: true })
  }

  async function retryPersistence(): Promise<void> {
    const before = stateRef.current
    if (before.pending) return
    if (before.persistence.mode !== 'session-only') return

    const preferences = isDraftDirty(before.draft, before.applied)
      ? draftToPreferences(before.draft)
      : before.applied
    await performSave(
      preferences,
      'retry',
      isDraftDirty(before.draft, before.applied),
    )
  }

  function reportDialogActive(active: boolean): void {
    const before = stateRef.current
    if (before.dialogOpen === active) return
    commit({ ...before, dialogOpen: active })
  }

  useEffect(() => {
    applyLanguage(resolution.language)
  }, [resolution.language])

  useEffect(() => {
    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== 'walday:preferences') return
      const before = stateRef.current
      const idle =
        !before.pending &&
        !before.localDraft &&
        !before.dialogOpen &&
        before.persistence.mode === 'normal'

      if (event.newValue === null) {
        if (idle) {
          const defaults = getDefaultPreferences()
          commit({
            ...before,
            applied: defaults,
            draft: toDraft(defaults),
            baseline: { revision: 'unknown' },
            persistence: { mode: 'session-only', reason: 'cleared' },
            externalChange: false,
            localDraft: false,
            notice: {
              kind: 'info',
              messageKey: 'feedback.clearedElsewhere',
            },
          })
        } else {
          commit({
            ...before,
            externalChange: true,
            persistence: { mode: 'conflict' },
            notice: {
              kind: 'conflict',
              messageKey: 'feedback.clearedElsewhere',
            },
          })
        }
        return
      }

      const loaded = loadPreferences(depsRef.current)

      if (loaded.kind === 'restored') {
        if (idle) {
          commit({
            ...before,
            applied: loaded.preferences,
            draft: toDraft(loaded.preferences),
            baseline: loaded.revision
              ? { revision: loaded.revision }
              : { revision: 'unknown' },
            persistence: { mode: 'normal' },
            externalChange: false,
            localDraft: false,
            notice: {
              kind: 'info',
              messageKey: 'feedback.updatedElsewhere',
            },
          })
        } else {
          commit({
            ...before,
            externalChange: true,
            persistence: { mode: 'conflict' },
            notice: { kind: 'conflict', messageKey: 'feedback.conflict' },
          })
        }
        return
      }

      if (loaded.kind === 'empty') {
        if (idle) {
          const defaults = getDefaultPreferences()
          commit({
            ...before,
            applied: defaults,
            draft: toDraft(defaults),
            baseline: { revision: 'unknown' },
            persistence: { mode: 'session-only', reason: 'cleared' },
            externalChange: false,
            localDraft: false,
            notice: {
              kind: 'info',
              messageKey: 'feedback.clearedElsewhere',
            },
          })
        } else {
          commit({
            ...before,
            externalChange: true,
            persistence: { mode: 'conflict' },
            notice: {
              kind: 'conflict',
              messageKey: 'feedback.clearedElsewhere',
            },
          })
        }
        return
      }

      commit({
        ...before,
        externalChange: true,
        persistence: { mode: 'conflict' },
        notice: { kind: 'error', messageKey: 'feedback.newerData' },
      })
    }

    window.addEventListener('storage', handleStorageEvent)
    return () => {
      window.removeEventListener('storage', handleStorageEvent)
    }
  }, [commit])

  return {
    ...state,
    dirty,
    effectiveLanguage: resolution.language,
    languageSource: resolution.source,
    formattingLocale: resolution.formattingLocale,
    timeZone,
    setLanguage,
    setDateTimePresentation,
    setWeatherUnits,
    setLocationQuery,
    searchLocations,
    selectLocation,
    clearLocation,
    cancelDraft,
    requestSave,
    confirmReplace,
    cancelReplace,
    requestReplace,
    retryPersistence,
    reportDialogActive,
  }
}

export type PreferencesController = ReturnType<typeof usePreferencesStore>
