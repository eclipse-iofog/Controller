function createDedupeHostList () {
  const hosts = []
  const seen = new Set()
  const addHost = (candidate) => {
    if (!candidate) return
    const trimmed = String(candidate).trim()
    if (trimmed.length === 0 || seen.has(trimmed)) return
    seen.add(trimmed)
    hosts.push(trimmed)
  }
  return { hosts, addHost }
}

function formatConnectAttempts (attempts, port) {
  if (!attempts || attempts.length === 0) {
    return 'no hosts configured'
  }
  return attempts.map((entry) => `${entry.host}:${port} (${entry.error})`).join('; ')
}

function aggregateConnectError (message, attempts, port) {
  const detail = formatConnectAttempts(attempts, port)
  const error = new Error(`${message}: ${detail}`)
  error.connectAttempts = attempts
  return error
}

module.exports = {
  createDedupeHostList,
  formatConnectAttempts,
  aggregateConnectError
}
