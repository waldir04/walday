import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Commitment } from '@/entities/commitment'
import {
  type CommitmentErrors,
  type CommitmentFormDraft,
  CommitmentForm,
  CommitmentList,
  useCommitments,
} from '@/features/commitments'

export function CommitmentsPage() {
  const { t } = useTranslation('commitments')
  const {
    commitments,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    validateDraft,
  } = useCommitments()

  const [draft, setDraft] = useState<CommitmentFormDraft>({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'fixed',
  })
  const [errors, setErrors] = useState<CommitmentErrors>({})
  const [overlap, setOverlap] = useState<{
    message: string
    details: string
  } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const isEditing = editingId !== null

  const handleChange = useCallback((next: CommitmentFormDraft) => {
    setDraft(next)
    setErrors({})
    setOverlap(null)
  }, [])

  const handleSave = useCallback(() => {
    const fieldErrors = validateDraft(draft)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    if (isEditing && editingId) {
      const updated = updateCommitment(editingId, draft)
      if (!updated) {
        setOverlap({
          message: t('commitments.overlap.message'),
          details: t('commitments.overlap.details'),
        })
        return
      }
      setEditingId(null)
      setDraft({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'fixed',
      })
    } else {
      const created = createCommitment(draft)
      if (!created) {
        setOverlap({
          message: t('commitments.overlap.message'),
          details: t('commitments.overlap.details'),
        })
        return
      }
      setDraft({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'fixed',
      })
    }
  }, [
    draft,
    isEditing,
    editingId,
    createCommitment,
    updateCommitment,
    validateDraft,
    t,
  ])

  const handleEdit = useCallback((commitment: Commitment) => {
    setDraft({
      title: commitment.title,
      description: commitment.description ?? '',
      date: commitment.date,
      startTime: commitment.startTime,
      endTime: commitment.endTime,
      type: commitment.type,
    })
    setEditingId(commitment.id)
    setErrors({})
    setOverlap(null)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm(t('commitments.confirmDelete'))) {
        deleteCommitment(id)
        if (editingId === id) setEditingId(null)
      }
    },
    [deleteCommitment, t, editingId],
  )

  return (
    <section>
      <h1 tabIndex={-1} className="text-2xl font-semibold">
        {t('commitments.heading')}
      </h1>
      <div className="mt-4 space-y-6">
        <CommitmentForm
          draft={draft}
          errors={errors}
          overlap={overlap}
          onChange={handleChange}
          onSave={handleSave}
        />
        <CommitmentList
          commitments={commitments}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </section>
  )
}
