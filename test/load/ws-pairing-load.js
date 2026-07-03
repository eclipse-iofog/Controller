#!/usr/bin/env node
/**
 * WebSocket pairing load probe.
 *
 * Measures ExecSessionManager pairing latency for N concurrent user+agent pairs.
 *
 * Usage:
 *   nvm use 24
 *   node test/load/ws-pairing-load.js
 *   node test/load/ws-pairing-load.js --pairs 500
 *   node test/load/ws-pairing-load.js --multi-ms 100
 *
 * --multi-ms N: create 5 exec sessions per microservice (concurrency quota) for N microservices.
 *
 * Exit 0 when p99 < 5000ms; exit 1 otherwise.
 */

const ExecSessionManager = require('../../src/websocket/exec-session-manager')
const MicroserviceExecSessionManager = require('../../src/data/managers/microservice-exec-session-manager')
const { createMockWebSocket, newTestIds, delay } = require('../support/ws-session-harness')

function parseArg (name, fallback) {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=')[1]
  const idx = process.argv.indexOf(`--${name}`)
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  return fallback
}

const PAIR_COUNT = parseInt(parseArg('pairs', '500'), 10)
const MULTI_MS_COUNT = parseInt(parseArg('multi-ms', '0'), 10)
const SESSIONS_PER_MS = 5

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

async function runPairBenchmark (execSessionManager, pairCount, label) {
  const latencies = []
  const batchSize = 50

  console.log(`WS pairing load probe — ${label} (${pairCount} pairs, batch ${batchSize})`)

  for (let batch = 0; batch < pairCount; batch += batchSize) {
    const tasks = []
    const count = Math.min(batchSize, pairCount - batch)

    for (let i = 0; i < count; i++) {
      tasks.push((async () => {
        const ids = newTestIds()
        const userWs = createMockWebSocket()
        const agentWs = createMockWebSocket()
        const transaction = { fakeTransaction: true }

        const start = Date.now()
        execSessionManager.createExecSession(
          ids.sessionId,
          ids.microserviceUuid,
          agentWs,
          userWs,
          transaction
        )
        latencies.push(Date.now() - start)

        execSessionManager.execSessions.delete(ids.sessionId)
      })())
    }

    await Promise.all(tasks)
  }

  return latencies
}

async function runMultiMsBenchmark (execSessionManager, microserviceCount) {
  const latencies = []
  const pairCount = microserviceCount * SESSIONS_PER_MS

  console.log(`WS multi-session load probe — ${microserviceCount} MS × ${SESSIONS_PER_MS} sessions (${pairCount} pairs)`)

  for (let ms = 0; ms < microserviceCount; ms++) {
    const ids = newTestIds()
    for (let slot = 0; slot < SESSIONS_PER_MS; slot++) {
      const userWs = createMockWebSocket()
      const agentWs = createMockWebSocket()
      const sessionId = `${ids.microserviceUuid}-session-${slot}`
      const transaction = { fakeTransaction: true }

      const start = Date.now()
      execSessionManager.createExecSession(
        sessionId,
        ids.microserviceUuid,
        agentWs,
        userWs,
        transaction
      )
      latencies.push(Date.now() - start)

      execSessionManager.execSessions.delete(sessionId)
    }
    if (ms > 0 && ms % 50 === 0) {
      await delay(0)
    }
  }

  return latencies
}

function reportResults (latencies, pairCount) {
  latencies.sort((a, b) => a - b)
  const p50 = percentile(latencies, 50)
  const p99 = percentile(latencies, 99)
  const max = latencies[latencies.length - 1]

  const sloMs = 5000
  const pass = p99 < sloMs

  console.log('')
  console.log('Results:')
  console.log(`  pairs:  ${pairCount}`)
  console.log(`  p50:    ${p50} ms`)
  console.log(`  p99:    ${p99} ms  (SLO < ${sloMs} ms)`)
  console.log(`  max:    ${max} ms`)
  console.log(`  status: ${pass ? 'PASS' : 'FAIL'}`)

  return pass
}

async function main () {
  MicroserviceExecSessionManager.deleteBySessionId = async () => {}

  const execSessionManager = new ExecSessionManager(FAST_CONFIG)
  execSessionManager.stopCleanupInterval()

  let latencies
  let pairCount

  if (MULTI_MS_COUNT > 0) {
    latencies = await runMultiMsBenchmark(execSessionManager, MULTI_MS_COUNT)
    pairCount = MULTI_MS_COUNT * SESSIONS_PER_MS
  } else {
    latencies = await runPairBenchmark(execSessionManager, PAIR_COUNT, `${PAIR_COUNT} pairs`)
    pairCount = PAIR_COUNT
  }

  const pass = reportResults(latencies, pairCount)
  process.exit(pass ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
