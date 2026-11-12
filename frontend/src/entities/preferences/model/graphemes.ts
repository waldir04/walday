const segmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

export function countGraphemes(value: string): number {
  if (segmenter) {
    return Array.from(segmenter.segment(value)).length
  }
  return Array.from(value).length
}
