import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker, useSearchParams } from 'react-router-dom'
import {
  commitmentsForDate,
  orderedCommitments,
  validateCommitmentDraft,
  type Commitment,
  type CommitmentDraft,
  type CommitmentFieldError,
} from '@/entities/commitment'
import { resolveDateStyle, usePreferences } from '@/entities/preferences'
import {
  CommitmentDateNav,
  CommitmentForm,
  CommitmentList,
  CommitmentNotices,
  DeleteCommitmentDialog,
  draftFromCommitment,
  emptyCommitmentDraft,
  isDraftDirty,
  useCommitments,
} from '@/features/commitments'
import { getLocalToday, isLocalDate } from '@/shared/lib/localDateTime'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

const ERROR_FOCUS_IDS: Record<string, string> = {
  title: 'commitment-title',
  description: 'commitment-description',
  date: 'commitment-date',
  startTime: 'commitment-start',
  endTime: 'commitment-end',
  type: 'commitment-type',
  range: 'commitment-end',
}

function sameDraft(a: CommitmentDraft, b: CommitmentDraft): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.date === b.date &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.type === b.type
  )
}

export function CommitmentsPage() {
  const { t, i18n } = useTranslation('commitments')
  const { formattingLocale, preferences } = usePreferences()
  const dateStyle = resolveDateStyle(preferences.dateTimePresentation)
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    commitments,
    mode,
    pending,
    externalChange,
    notice,
    create,
    update,
    deleteCommitment,
    reload,
    focusAfterDelete,
    handleDeleteFocusHandled,
  } = useCommitments()

  const rawDate = searchParams.get('date')
  const viewedDate = rawDate && isLocalDate(rawDate) ? rawDate : getLocalToday()
  const ordered = useMemo(
    () =>
      orderedCommitments(
        commitmentsForDate(commitments, viewedDate),
        i18n.language,
      ),
    [commitments, viewedDate, i18n.language],
  )

  const [draft, setDraft] = useState<CommitmentDraft>(() =>
    emptyCommitmentDraft(viewedDate),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<CommitmentFieldError[]>([])
  const [conflicts, setConflicts] = useState<Commitment[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Commitment | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const original = useMemo(
    () =>
      editingId
        ? (commitments.find((item) => item.id === editingId) ?? null)
        : null,
    [commitments, editingId],
  )
  const dirty = original
    ? !sameDraft(draft, draftFromCommitment(original))
    : isDraftDirty(draft)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  )

  useEffect(() => {
    if (conflicts.length === 0) return
    document.getElementById('commitment-overlap-heading')?.focus()
  }, [conflicts])

  useEffect(() => {
    if (focusAfterDelete === null) return
    const target = focusAfterDelete
    requestAnimationFrame(() => {
      if (target === 'empty') {
        document.getElementById('commitment-empty-action')?.focus()
        return
      }
      document
        .querySelector<HTMLElement>(`[data-commitment-id="${target}"]`)
        ?.focus()
    })
    handleDeleteFocusHandled()
  }, [focusAfterDelete, handleDeleteFocusHandled])

  const resetForm = useCallback(() => {
    setDraft(emptyCommitmentDraft(viewedDate))
    setEditingId(null)
    setErrors([])
    setConflicts([])
    setAcknowledged(false)
    setSubmitted(false)
  }, [viewedDate])

  function handleFieldChange(field: keyof CommitmentDraft, value: string) {
    const next = { ...draft, [field]: value } as CommitmentDraft
    setDraft(next)
    if (submitted) setErrors(validateCommitmentDraft(next))
    if (field === 'date' || field === 'startTime' || field === 'endTime') {
      setConflicts([])
      setAcknowledged(false)
    }
  }

  async function handleSave() {
    if (pending) return
    const fieldErrors = validateCommitmentDraft(draft)
    setErrors(fieldErrors)
    setSubmitted(true)
    if (fieldErrors.length > 0) {
      setConflicts([])
      setAcknowledged(false)
      requestAnimationFrame(() => {
        if (fieldErrors.length > 1) {
          summaryRef.current?.focus()
        } else {
          const first = fieldErrors[0]
          if (first) {
            document.getElementById(ERROR_FOCUS_IDS[first.field] ?? '')?.focus()
          }
        }
      })
      return
    }

    const result = editingId
      ? await update(editingId, draft, acknowledged)
      : await create(draft, acknowledged)

    if (!result.ok) {
      if (result.reason === 'validation') {
        setErrors(result.errors ?? [])
        return
      }
      if (result.reason === 'overlap') {
        setConflicts(result.conflicts ?? [])
        setAcknowledged(false)
        return
      }
      return
    }

    resetForm()
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function handleEdit(commitment: Commitment) {
    setDraft(draftFromCommitment(commitment))
    setEditingId(commitment.id)
    setErrors([])
    setConflicts([])
    setAcknowledged(false)
    setSubmitted(false)
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  function requestCancel() {
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    resetForm()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const result = await deleteCommitment(deleteTarget.id)
    if (result.ok) {
      const deletedId = deleteTarget.id
      setDeleteTarget(null)
      if (editingId === deletedId) resetForm()
    }
  }

  const formDisabled = mode !== 'normal' || externalChange

  return (
    <section className="grid gap-6">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-title font-semibold text-text"
      >
        {t('commitments.heading')}
      </h1>

      <CommitmentNotices
        notice={notice}
        externalChange={externalChange}
        pending={pending}
        onReload={() => window.location.reload()}
        onRetry={reload}
      />

      <CommitmentDateNav
        date={viewedDate}
        onChange={(date) => {
          setSearchParams({ date })
          if (!dirty && !editingId) {
            setDraft((current) => ({ ...current, date }))
          }
        }}
      />

      <CommitmentForm
        draft={draft}
        editing={editingId !== null}
        errors={errors}
        conflicts={conflicts}
        acknowledged={acknowledged}
        pending={pending}
        disabled={formDisabled}
        formattingLocale={formattingLocale}
        titleRef={titleRef}
        summaryRef={summaryRef}
        onFieldChange={handleFieldChange}
        onAcknowledgedChange={setAcknowledged}
        onSave={handleSave}
        onCancel={requestCancel}
        onDecline={() => {
          setConflicts([])
          setAcknowledged(false)
        }}
      />

      {formDisabled && ordered.length === 0 ? null : (
        <CommitmentList
          commitments={ordered}
          allCommitments={commitments}
          formattingLocale={formattingLocale}
          dateStyle={dateStyle}
          disabled={formDisabled}
          onCreateRequested={() => {
            resetForm()
            requestAnimationFrame(() => titleRef.current?.focus())
          }}
          onEdit={handleEdit}
          onDelete={(commitment) => setDeleteTarget(commitment)}
        />
      )}

      <DeleteCommitmentDialog
        open={deleteTarget !== null}
        title={deleteTarget?.title ?? ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={discardOpen}
        heading={t('commitments.unsaved.heading')}
        description={t('commitments.unsaved.description')}
        confirmLabel={t('commitments.unsaved.discard')}
        cancelLabel={t('commitments.unsaved.stay')}
        onConfirm={() => {
          setDiscardOpen(false)
          resetForm()
        }}
        onCancel={() => setDiscardOpen(false)}
        danger
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        heading={t('commitments.unsaved.heading')}
        description={t('commitments.unsaved.description')}
        confirmLabel={t('commitments.unsaved.discard')}
        cancelLabel={t('commitments.unsaved.stay')}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        danger
      />
    </section>
  )
}
