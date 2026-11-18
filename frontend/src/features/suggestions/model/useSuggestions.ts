import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatDuration } from '@/entities/task'
import type { TFunction } from 'i18next'
import i18n from '@/shared/i18n'
import {
  formatLocalTime,
  getLocalToday,
  isLocalTime,
  minuteOfDayRoundedUp,
  parseLocalTime,
} from '@/shared/lib/localDateTime'
import {
  dismissSuggestion,
  loadDismissals,
  restoreSuggestion,
} from './dismissalStorage'
import { generateCandidates, selectSuggestions } from './generate'
import { activityKeyFor, changeSignatureFor } from './identity'
import type {
  DismissalState,
  GenerateCandidatesInput,
  PlanningSuggestion,
  SuggestionApplier,
  SuggestionApplyFailure,
  SuggestionApplyFailureCode,
  SuggestionApplyOutcome,
  SuggestionConflictLink,
  SuggestionController,
  SuggestionView,
  SuggestionsSurfaceState,
  UseSuggestionsOptions,
} from './types'

const DAY_END_MINUTES = 1440

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function minutesToTime(value: number): string {
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`
}

function failure(
  code: SuggestionApplyFailureCode,
  retryable: boolean,
  conflicts: readonly SuggestionConflictLink[] = [],
): SuggestionApplyFailure {
  return { ok: false, code, retryable, conflicts }
}

/**
 * A presented change stays applicable while every non-weather constraint still
 * holds. This is what lets a weather-influenced card survive the forecast
 * becoming unavailable without being silently reversed.
 */
function presentedChangeIsValid(input: {
  view: SuggestionView
  tasks: UseSuggestionsOptions['tasks']
  commitments: UseSuggestionsOptions['commitments']
  entries: UseSuggestionsOptions['day']['entries']
  nowMinutes: number
}): boolean {
  const { view, tasks, commitments, entries, nowMinutes } = input
  const change = view.change
  const startMinutes = change.startMinutes
  const endMinutes = startMinutes + change.durationMinutes

  if (
    startMinutes < nowMinutes ||
    startMinutes < 0 ||
    endMinutes > DAY_END_MINUTES ||
    endMinutes <= startMinutes
  ) {
    return false
  }

  if (change.kind === 'move-commitment') {
    const commitment = commitments.find(
      (candidate) => candidate.id === change.commitmentId,
    )
    if (
      !commitment ||
      commitment.type !== 'flexible' ||
      commitment.date !== change.date ||
      commitment.startTime !== minutesToTime(change.fromStartMinutes) ||
      commitment.endTime !== minutesToTime(change.fromEndMinutes)
    ) {
      return false
    }
  } else {
    const task = tasks.find((candidate) => candidate.id === change.taskId)
    if (
      !task ||
      task.status !== 'pending' ||
      task.estimatedMinutes !== change.durationMinutes
    ) {
      return false
    }
    if (change.kind === 'schedule-task') {
      if (task.plannedDate !== undefined) return false
    } else if (
      task.plannedDate !== change.plannedDate ||
      task.plannedStartTime !== minutesToTime(change.fromStartMinutes)
    ) {
      return false
    }
  }

  for (const entry of entries) {
    const entryKey = `${
      entry.category === 'task' ? 'task' : 'commitment'
    }:${entry.sourceId}`
    if (entryKey === view.activityKey) continue
    if (startMinutes < entry.endMinutes && entry.startMinutes < endMinutes) {
      return false
    }
  }

  return true
}

export function useSuggestions(
  options: UseSuggestionsOptions,
): SuggestionController {
  const {
    day,
    tasks,
    commitments,
    sources,
    weather,
    now,
    applyTaskSlot,
    applyCommitmentMove,
    locale,
  } = options

  const t = useMemo(() => i18n.getFixedT(locale, 'suggestions'), [locale])

  const today = getLocalToday(now)
  const nowMinutes = minuteOfDayRoundedUp(now)

  const [dismissalState, setDismissalState] = useState<DismissalState>(() =>
    loadDismissals({ today }),
  )
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<{
    suggestionId: string
    code: string
  } | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const applyingRef = useRef(false)
  const presentedRef = useRef(new Map<string, SuggestionView>())

  const generationInput = useMemo<GenerateCandidatesInput>(
    () => ({
      date: day.date,
      entries: day.entries,
      conflicts: day.conflicts,
      unscheduledTasks: day.unscheduledTasks,
      availability: day.availability,
      tasks,
      commitments,
      weather,
      nowMinutes,
    }),
    [
      day.date,
      day.entries,
      day.conflicts,
      day.unscheduledTasks,
      day.availability,
      tasks,
      commitments,
      weather,
      nowMinutes,
    ],
  )

  const hasPendingUnscheduledTasks = tasks.some(
    (task) => task.status === 'pending' && task.plannedDate === undefined,
  )
  const allUnscheduledDurationsMissing =
    hasPendingUnscheduledTasks &&
    tasks
      .filter((task) => task.status === 'pending' && !task.plannedDate)
      .every(
        (task) =>
          task.estimatedMinutes === undefined || task.estimatedMinutes < 1,
      )
  const hasConflicts = (day.conflicts?.length ?? 0) > 0
  const hasOnlyFixedConflicts =
    hasConflicts &&
    day.entries.every(
      (entry) =>
        !day.conflicts?.some((group) => group.entryKeys.includes(entry.key)) ||
        entry.category === 'fixed-commitment',
    )

  const state = useMemo<SuggestionsSurfaceState>(() => {
    void retryTick

    if (sources === 'loading') return { status: 'loading' }
    if (sources === 'incomplete') return { status: 'incomplete' }
    if (day.date !== today) {
      return {
        status: 'ready',
        suggestions: [],
        dismissed: [],
        noSuggestionReason: null,
        applyingId,
        applyError,
        announcement,
      }
    }

    let candidates: PlanningSuggestion[]
    try {
      candidates = generateCandidates(generationInput)
    } catch {
      return { status: 'error' }
    }

    const selection = selectSuggestions({
      candidates,
      dismissals: dismissalState.entries,
      hasPendingUnscheduledTasks,
      allUnscheduledDurationsMissing,
      hasConflicts,
      hasOnlyFixedConflicts,
    })

    const generatedActive = selection.active.map((suggestion) =>
      toView(suggestion, locale, t('time.endOfDay')),
    )
    const generatedDismissed = selection.dismissed.map((suggestion) =>
      toView(suggestion, locale, t('time.endOfDay')),
    )

    let active = generatedActive
    if (weather.status === 'unavailable') {
      const dismissedIds = new Set(generatedDismissed.map((view) => view.id))
      const retainedKeys = new Set<string>()
      const retained: SuggestionView[] = []
      // The cache is read during render on purpose: a weather change must be
      // able to keep an already-presented, still-valid card stable.
      // eslint-disable-next-line react-hooks/refs
      for (const view of presentedRef.current.values()) {
        if (view.weatherEvidence === null) continue
        if (dismissedIds.has(view.id)) continue
        if (
          !presentedChangeIsValid({
            view,
            tasks,
            commitments,
            entries: day.entries,
            nowMinutes,
          })
        ) {
          continue
        }
        retained.push({
          ...view,
          weatherEvidence: null,
          reasons: view.reasons.filter((reason) => reason.kind !== 'weather'),
        })
        retainedKeys.add(view.activityKey)
      }
      if (retained.length > 0) {
        active = [
          ...retained,
          ...generatedActive.filter(
            (view) => !retainedKeys.has(view.activityKey),
          ),
        ].slice(0, 3)
      }
    }

    return {
      status: 'ready',
      suggestions: active,
      dismissed: generatedDismissed,
      noSuggestionReason:
        active.length > 0 ? null : selection.noSuggestionReason,
      applyingId,
      applyError,
      announcement,
    }
  }, [
    applyError,
    announcement,
    allUnscheduledDurationsMissing,
    applyingId,
    day.date,
    dismissalState.entries,
    generationInput,
    hasConflicts,
    hasOnlyFixedConflicts,
    hasPendingUnscheduledTasks,
    locale,
    retryTick,
    sources,
    t,
    today,
    commitments,
    day.entries,
    nowMinutes,
    tasks,
    weather,
  ])

  // Keep the exact suggestion content that was presented. A later data change
  // must be revalidated against this change, never silently replaced by a
  // freshly generated one with the same identity.
  useLayoutEffect(() => {
    if (state.status !== 'ready') return
    const seen = new Set<string>()
    for (const view of [...state.suggestions, ...state.dismissed]) {
      seen.add(view.id)
      if (!presentedRef.current.has(view.id)) {
        presentedRef.current.set(view.id, view)
      }
    }
    for (const id of presentedRef.current.keys()) {
      if (!seen.has(id)) presentedRef.current.delete(id)
    }
  }, [state])

  const conflictsFor = useCallback(
    (
      activityKey: string,
      startMinutes: number,
      endMinutes: number,
    ): SuggestionConflictLink[] => {
      const links: SuggestionConflictLink[] = []
      for (const entry of day.entries) {
        const entryKey = `${
          entry.category === 'task' ? 'task' : 'commitment'
        }:${entry.sourceId}`
        if (entryKey === activityKey) continue
        if (
          startMinutes < entry.endMinutes &&
          entry.startMinutes < endMinutes
        ) {
          links.push({
            title: entry.title,
            startMinutes: Math.max(startMinutes, entry.startMinutes),
            endMinutes: Math.min(endMinutes, entry.endMinutes),
          })
        }
      }
      return links
    },
    [day.entries],
  )

  const runApply = useCallback(
    async (
      view: SuggestionView,
      startMinutes: number,
      acknowledged: boolean,
      isAdjustment: boolean,
    ): Promise<SuggestionApplyOutcome> => {
      const change = view.change
      const endMinutes = startMinutes + change.durationMinutes

      if (
        startMinutes < 0 ||
        startMinutes >= DAY_END_MINUTES ||
        endMinutes > DAY_END_MINUTES ||
        endMinutes <= startMinutes
      ) {
        return failure('invalid-time', true)
      }
      if (startMinutes < nowMinutes) return failure('invalid-time', true)

      if (change.kind === 'move-commitment') {
        const commitment = commitments.find(
          (candidate) => candidate.id === change.commitmentId,
        )
        if (
          !commitment ||
          commitment.type !== 'flexible' ||
          commitment.date !== change.date
        ) {
          return failure('stale-target', false)
        }
        if (
          commitment.startTime !== minutesToTime(change.fromStartMinutes) ||
          commitment.endTime !== minutesToTime(change.fromEndMinutes)
        ) {
          return failure('stale-target', false)
        }
      } else {
        const task = tasks.find((candidate) => candidate.id === change.taskId)
        if (!task || task.status !== 'pending') {
          return failure('stale-target', false)
        }
        if (task.estimatedMinutes !== change.durationMinutes) {
          return failure('stale-target', false)
        }
        if (change.kind === 'schedule-task') {
          if (task.plannedDate !== undefined) {
            return failure('stale-target', false)
          }
        } else if (
          task.plannedDate !== change.plannedDate ||
          task.plannedStartTime !== minutesToTime(change.fromStartMinutes)
        ) {
          return failure('stale-target', false)
        }
      }

      const conflicts = conflictsFor(view.activityKey, startMinutes, endMinutes)
      if (conflicts.length > 0 && !acknowledged) {
        return isAdjustment
          ? failure('needs-acknowledgment', true, conflicts)
          : failure('stale-target', false)
      }

      applyingRef.current = true
      setApplyingId(view.id)
      setApplyError(null)

      try {
        const startTime = minutesToTime(startMinutes)
        const result: { ok: true } | { ok: false; reason: string } =
          change.kind === 'move-commitment'
            ? await applyCommitmentMove({
                commitmentId: change.commitmentId,
                startTime,
                endTime: minutesToTime(endMinutes),
                acknowledged,
              })
            : await applyTaskSlot({
                taskId: change.taskId,
                startTime,
                durationMinutes: change.durationMinutes,
                acknowledged,
              })

        if (!result.ok) {
          const code: SuggestionApplyFailureCode =
            result.reason === 'stale' ||
            result.reason === 'missing' ||
            result.reason === 'TASK_NOT_FOUND' ||
            result.reason === 'TASK_NOT_PENDING'
              ? 'stale-target'
              : 'apply-failed'
          setApplyError({ suggestionId: view.id, code })
          return failure(code, code !== 'stale-target')
        }

        setAnnouncement(appliedAnnouncement(t, view, startMinutes))
        return { ok: true, appliedId: view.id }
      } catch {
        setApplyError({ suggestionId: view.id, code: 'apply-failed' })
        return failure('apply-failed', true)
      } finally {
        applyingRef.current = false
        setApplyingId(null)
      }
    },
    [
      applyCommitmentMove,
      applyTaskSlot,
      commitments,
      conflictsFor,
      nowMinutes,
      t,
      tasks,
    ],
  )

  const accept = useCallback(
    async (suggestionId: string): Promise<SuggestionApplyOutcome> => {
      if (applyingRef.current) return failure('apply-failed', true)
      const view = presentedRef.current.get(suggestionId)
      if (!view) return failure('stale-target', false)
      return runApply(view, view.change.startMinutes, false, false)
    },
    [runApply],
  )

  const adjust = useCallback(
    async (input: {
      suggestionId: string
      startTime: string
      acknowledged: boolean
    }): Promise<SuggestionApplyOutcome> => {
      if (applyingRef.current) return failure('apply-failed', true)
      const view = presentedRef.current.get(input.suggestionId)
      if (!view) return failure('stale-target', false)

      const trimmed = input.startTime.trim()
      if (!isLocalTime(trimmed)) return failure('invalid-time', true)
      const parsed = parseLocalTime(trimmed)
      if (!parsed) return failure('invalid-time', true)

      return runApply(
        view,
        parsed.hours * 60 + parsed.minutes,
        input.acknowledged,
        true,
      )
    },
    [runApply],
  )

  const dismiss = useCallback(
    async (suggestionId: string) => {
      const view = presentedRef.current.get(suggestionId)
      if (!view) return
      const result = await dismissSuggestion({
        state: dismissalState,
        suggestion: {
          id: view.id,
          activityKey: view.activityKey,
          changeSignature: view.changeSignature,
        },
        now,
        today,
      })
      setDismissalState(result.state)
      const base = t('feedback.dismissed', { title: view.targetTitle })
      setAnnouncement(
        result.ok ? base : `${base} ${t('feedback.dismissalNotSaved')}`,
      )
    },
    [dismissalState, now, t, today],
  )

  const restore = useCallback(
    async (suggestionId: string) => {
      const view = presentedRef.current.get(suggestionId)
      const result = await restoreSuggestion({
        state: dismissalState,
        suggestionId,
        today,
      })
      setDismissalState(result.state)
      if (view) {
        setAnnouncement(t('feedback.restored', { title: view.targetTitle }))
      }
    },
    [dismissalState, t, today],
  )

  const retry = useCallback(() => {
    setApplyError(null)
    setRetryTick((tick) => tick + 1)
  }, [])

  return {
    state,
    persistence: dismissalState.persistence,
    accept,
    adjust,
    dismiss,
    restore,
    retry,
  }
}

function toView(
  suggestion: PlanningSuggestion,
  locale: string,
  endOfDayLabel: string,
): SuggestionView {
  const { change } = suggestion
  const formatMinutes = (minutes: number): string =>
    minutes >= DAY_END_MINUTES
      ? endOfDayLabel
      : formatLocalTime(minutesToTime(minutes), locale)

  const currentLabel =
    change.kind === 'schedule-task'
      ? null
      : `${formatMinutes(change.fromStartMinutes)} – ${formatMinutes(change.fromEndMinutes)}`

  return {
    id: suggestion.id,
    category: suggestion.category,
    targetTitle: suggestion.target.title,
    activityKey: activityKeyFor(suggestion.target),
    currentLabel,
    proposedLabel: `${formatMinutes(change.startMinutes)} – ${formatMinutes(change.endMinutes)}`,
    proposedStartMinutes: change.startMinutes,
    durationMinutes: change.durationMinutes,
    change,
    changeSignature: changeSignatureFor(change),
    reasons: suggestion.reasons,
    weatherEvidence: suggestion.weather,
    durationLabel: formatDuration(change.durationMinutes, locale),
  }
}

function appliedAnnouncement(
  t: TFunction<'suggestions'>,
  view: SuggestionView,
  startMinutes: number,
): string {
  const time = minutesToTime(startMinutes)
  if (view.change.kind === 'schedule-task') {
    return t('feedback.scheduledTask', { title: view.targetTitle, time })
  }
  return t('feedback.appliedTask', { title: view.targetTitle, time })
}

export type {
  SuggestionApplier,
  SuggestionApplyFailure,
  SuggestionApplyOutcome,
  SuggestionController,
  SuggestionView,
  SuggestionsSurfaceState,
  UseSuggestionsOptions,
}
