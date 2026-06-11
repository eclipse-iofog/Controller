'use strict'

const config = require('./index')

function normalizeUrl (value) {
  return String(value || '').replace(/\/$/, '')
}

function getPublicUrl () {
  return normalizeUrl(process.env.CONTROLLER_PUBLIC_URL || config.get('server.publicUrl') || '')
}

function getViewerUrl () {
  const explicit = process.env.VIEWER_URL || config.get('viewer.url')
  if (explicit) {
    return normalizeUrl(explicit)
  }
  return getPublicUrl()
}

module.exports = {
  getPublicUrl,
  getViewerUrl,
  normalizeUrl
}
