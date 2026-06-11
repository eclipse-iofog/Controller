'use strict'

const config = require('./index')

function normalizeUrl (value) {
  return String(value || '').replace(/\/$/, '')
}

function getPublicUrl () {
  return normalizeUrl(process.env.CONTROLLER_PUBLIC_URL || config.get('server.publicUrl') || '')
}

function getConsoleUrl () {
  const explicit = process.env.CONSOLE_URL || config.get('console.url')
  if (explicit) {
    return normalizeUrl(explicit)
  }
  return getPublicUrl()
}

module.exports = {
  getPublicUrl,
  getConsoleUrl,
  normalizeUrl
}
