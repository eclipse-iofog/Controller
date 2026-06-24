#!/usr/bin/env node
/**
 * WebSocket pairing load probe.
 *
 * Measures SessionManager pairing latency for N concurrent user+agent pairs.
 * Target SLO (R88): 500 concurrent WS/replica, p99 pairing < 5s.
 *
 * Usage:
 *   nvm use 24
 *   node test/load/ws-pairing-load.js
 *   node test/load/ws-pairing-load.js --pairs 500
 *
 * Exit 0 when p99 < 5000ms; exit 1 otherwise.
 */

const SessionManager = require('../../src/websocket/session-manager')
const MicroserviceExecStatusManager = require('../../src/data/managers/microservice-exec-status-manager')
const { createMockWebSocket, newTestIds, delay } = require('../support/ws-session-harness')

const PAIR_COUNT = parseInt(process.argv.find((a) => a.startsWith('--pairs='))?.split('=')[1] ||
  (process.argv.includes('--pairs') ? process.argv[process.argv.indexOf('--pairs') + 1] : '500'), 10)

const FAST_CONFIG = {
  session: {
    execPendingTimeoutMs: 60000,
    execMaxDurationMs: 28800000,
    cleanupInterval: 30000
  }
}

function percentile (sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

async function main () {
  MicroserviceExecStatusManager.update = async () => {}

  const sessionManager = new SessionManager(FAST_CONFIG)
  const latencies = []
  const batchSize = 50

  console.log(`WS pairing load probe — ${PAIR_COUNT} pairs (batch ${batchSize})`)

  for (let batch = 0; batch < PAIR_COUNT; batch += batchSize) {
    const tasks = []
    const count = Math.min(batchSize, PAIR_COUNT - batch)

    for (let i = 0; i < count; i++) {
      tasks.push((async () => {
        const ids = newTestIds()
        const userWs = createMockWebSocket()
        const agentWs = createMockWebSocket()
        const transaction = { fakeTransaction: true }

        sessionManager.addPendingUser(ids.microserviceUuid, userWs)
        const start = Date.now()
        await sessionManager.tryActivateSession(ids.microserviceUuid, ids.execId, agentWs, true, transaction)
        latencies.push(Date.now() - start)

        sessionManager.sessions.delete(ids.execId)
        sessionManager.removePendingUser(ids.microserviceUuid, userWs)
      })())
    }

    await Promise.all(tasks)
  }

  latencies.sort((a, b) => a - b)
  const p50 = percentile(latencies, 50)
  const p99 = percentile(latencies, 99)
  const max = latencies[latencies.length - 1]

  const sloMs = 5000
  const pass = p99 < sloMs

  console.log('')
  console.log('Results:')
  console.log(`  pairs:  ${PAIR_COUNT}`)
  console.log(`  p50:    ${p50} ms`)
  console.log(`  p99:    ${p99} ms  (SLO < ${sloMs} ms)`)
  console.log(`  max:    ${max} ms`)
  console.log(`  status: ${pass ? 'PASS' : 'FAIL'}`)

  process.exit(pass ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
