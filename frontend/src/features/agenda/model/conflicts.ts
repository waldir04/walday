import type { AgendaEntry, ConflictLink, TimeConflict } from './types'

interface Edge {
  a: number
  b: number
  overlapStartMinutes: number
  overlapEndMinutes: number
}

function findRoot(parents: number[], index: number): number {
  let current = index
  while (parents[current] !== current) {
    const parent = parents[current]
    if (parent === undefined) return current
    current = parent
  }
  return current
}

function union(parents: number[], a: number, b: number): void {
  const rootA = findRoot(parents, a)
  const rootB = findRoot(parents, b)
  if (rootA === rootB) return
  if (rootA < rootB) {
    parents[rootB] = rootA
  } else {
    parents[rootA] = rootB
  }
}

function linkFor(
  other: AgendaEntry,
  overlapStartMinutes: number,
  overlapEndMinutes: number,
): ConflictLink {
  return {
    entryKey: other.key,
    title: other.title,
    category: other.category,
    overlapStartMinutes,
    overlapEndMinutes,
  }
}

/**
 * Derive conflict groups from intersecting entry periods. Boundary-touching
 * pairs are not conflicts. Groups are connected components, so a three-way
 * overlap is one group. Inputs are never mutated.
 */
export function deriveConflicts(entries: readonly AgendaEntry[]): {
  conflicts: TimeConflict[]
  entries: AgendaEntry[]
} {
  const edges: Edge[] = []

  for (let i = 0; i < entries.length; i += 1) {
    const a = entries[i]
    if (!a) continue
    for (let j = i + 1; j < entries.length; j += 1) {
      const b = entries[j]
      if (!b) continue
      if (a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes) {
        edges.push({
          a: i,
          b: j,
          overlapStartMinutes: Math.max(a.startMinutes, b.startMinutes),
          overlapEndMinutes: Math.min(a.endMinutes, b.endMinutes),
        })
      }
    }
  }

  if (edges.length === 0) {
    return { conflicts: [], entries: entries.map((entry) => ({ ...entry })) }
  }

  const parents = Array.from({ length: entries.length }, (_, index) => index)
  for (const edge of edges) {
    union(parents, edge.a, edge.b)
  }

  const groups = new Map<number, number[]>()
  for (let index = 0; index < entries.length; index += 1) {
    const root = findRoot(parents, index)
    const members = groups.get(root)
    if (members) {
      members.push(index)
    } else {
      groups.set(root, [index])
    }
  }

  const linked = entries.map((entry) => ({
    ...entry,
    conflicts: [] as ConflictLink[],
  }))

  for (const edge of edges) {
    const a = entries[edge.a]
    const b = entries[edge.b]
    const linkedA = linked[edge.a]
    const linkedB = linked[edge.b]
    if (!a || !b || !linkedA || !linkedB) continue
    linkedA.conflicts.push(
      linkFor(b, edge.overlapStartMinutes, edge.overlapEndMinutes),
    )
    linkedB.conflicts.push(
      linkFor(a, edge.overlapStartMinutes, edge.overlapEndMinutes),
    )
  }

  const conflicts: TimeConflict[] = []
  for (const members of groups.values()) {
    if (members.length < 2) continue
    const memberEntries = members
      .map((index) => entries[index])
      .filter((entry): entry is AgendaEntry => entry !== undefined)
    const first = memberEntries[0]
    if (!first) continue

    const keys = memberEntries.map((entry) => entry.key)
    const id = [...keys].sort((a, b) => a.localeCompare(b))[0] ?? first.key

    conflicts.push({
      id,
      entryKeys: keys,
      activityCount: memberEntries.length,
      startMinutes: Math.min(
        ...memberEntries.map((entry) => entry.startMinutes),
      ),
      endMinutes: Math.max(...memberEntries.map((entry) => entry.endMinutes)),
      adjustableKeys: memberEntries
        .filter((entry) => entry.category === 'flexible-commitment')
        .map((entry) => entry.key),
    })
  }

  conflicts.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes
    }
    return a.id.localeCompare(b.id)
  })

  return { conflicts, entries: linked }
}
