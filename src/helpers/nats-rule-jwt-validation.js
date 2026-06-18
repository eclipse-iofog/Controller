'use strict'

const Errors = require('./errors')

function findNonLatin1Char (value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null
  }
  for (const char of value) {
    const codePoint = char.codePointAt(0)
    if (codePoint > 0xff) {
      return {
        char,
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
      }
    }
  }
  return null
}

function _formatLatin1Error (ruleName, ruleKind, fieldPath, { char, codePoint }) {
  const label = ruleName ? `NATS ${ruleKind} rule "${ruleName}"` : `NATS ${ruleKind} rule`
  return `${label} cannot be encoded as a JWT: field "${fieldPath}" contains non-Latin-1 character ${codePoint} (${char}). Use ASCII/Latin-1 text only.`
}

function assertLatin1String (value, fieldPath, ruleName, ruleKind) {
  const found = findNonLatin1Char(value)
  if (found) {
    throw new Errors.ValidationError(_formatLatin1Error(ruleName, ruleKind, fieldPath, found))
  }
}

function _parseJsonArray (value) {
  if (!value) {
    return []
  }
  if (Array.isArray(value)) {
    return value
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function _parseJsonObject (value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  if (typeof value !== 'string') {
    return null
  }
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch (error) {
    return null
  }
}

function _definedFields (rule) {
  if (!rule || typeof rule !== 'object') {
    return {}
  }
  return Object.fromEntries(Object.entries(rule).filter(([, value]) => value !== undefined))
}

function _walkStrings (value, fieldPath, collect) {
  if (typeof value === 'string') {
    collect(fieldPath, value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => _walkStrings(item, `${fieldPath}[${index}]`, collect))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const path = fieldPath ? `${fieldPath}.${key}` : key
      _walkStrings(nested, path, collect)
    }
  }
}

function _collectAccountRuleJwtStrings (rule) {
  const strings = []
  const collect = (path, value) => strings.push({ path, value })

  if (rule.description != null) {
    collect('description', rule.description)
  }
  if (rule.infoUrl != null) {
    collect('infoUrl', rule.infoUrl)
  }

  _walkStrings(_parseJsonArray(rule.exports), 'exports', collect)
  _walkStrings(_parseJsonArray(rule.imports), 'imports', collect)

  for (const field of ['pubAllow', 'pubDeny', 'subAllow', 'subDeny']) {
    _parseJsonArray(rule[field]).forEach((val, index) => {
      if (typeof val === 'string') {
        collect(`${field}[${index}]`, val)
      }
    })
  }

  const tiered = _parseJsonObject(rule.tieredLimits)
  if (tiered) {
    _walkStrings(tiered, 'tieredLimits', collect)
  }

  return strings
}

function _collectUserRuleJwtStrings (rule) {
  const strings = []
  const collect = (path, value) => strings.push({ path, value })

  for (const field of ['pubAllow', 'pubDeny', 'subAllow', 'subDeny', 'src', 'tags']) {
    _parseJsonArray(rule[field]).forEach((val, index) => {
      if (typeof val === 'string') {
        collect(`${field}[${index}]`, val)
      }
    })
  }

  if (rule.timesLocation != null) {
    collect('timesLocation', rule.timesLocation)
  }

  _parseJsonArray(rule.times).forEach((entry, index) => {
    if (entry && typeof entry === 'object') {
      if (entry.start != null) {
        collect(`times[${index}].start`, entry.start)
      }
      if (entry.end != null) {
        collect(`times[${index}].end`, entry.end)
      }
    }
  })

  return strings
}

function _assertRuleJwtEncodable (rule, ruleKind, collectStrings, options = {}) {
  if (!rule) {
    return
  }
  const ruleName = options.ruleName != null ? options.ruleName : rule.name
  const source = options.partial ? _definedFields(rule) : rule
  for (const { path, value } of collectStrings(source)) {
    assertLatin1String(value, path, ruleName, ruleKind)
  }
}

function assertAccountRuleJwtEncodable (rule, options = {}) {
  _assertRuleJwtEncodable(rule, 'account', _collectAccountRuleJwtStrings, options)
}

function assertUserRuleJwtEncodable (rule, options = {}) {
  _assertRuleJwtEncodable(rule, 'user', _collectUserRuleJwtStrings, options)
}

module.exports = {
  findNonLatin1Char,
  assertLatin1String,
  assertAccountRuleJwtEncodable,
  assertUserRuleJwtEncodable
}
