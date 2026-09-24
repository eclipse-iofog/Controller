const KNOWN_FORMATS = new Set([
  'markdown',
  'pdf',
  'jsonl',
  'parquet',
  'arrow',
  'sqlite',
  'faiss',
  'chroma',
  'lance'
])

/**
 * Soft hint for a Knowledge artifact. Never throws.
 * Omit, null, and empty string stay unset. Known tokens persist lowercase.
 * Any other value persists "unknown".
 * @param {*} value
 * @returns {string|null}
 */
function normalizeKnowledgeFormat (value) {
  if (value == null || value === '') {
    return null
  }
  if (typeof value !== 'string') {
    return 'unknown'
  }
  const token = value.toLowerCase()
  if (KNOWN_FORMATS.has(token)) {
    return token
  }
  return 'unknown'
}

module.exports = {
  normalizeKnowledgeFormat
}
