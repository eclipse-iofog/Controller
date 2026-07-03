const config = require('../config')
const logger = require('../logger')

const RECONCILE_HEAVY_JOBS = new Set([
  'platform-reconcile-worker-job.js',
  'nats-reconcile-worker-job.js',
  'fog-platform-sweep-job.js',
  'fog-status-job.js',
  'reconcile-outbox-drainer-job.js'
])

const JOB_STAGGER_MS = 500

/**
 * Start background jobs after API listen. Reconcile-heavy jobs are delayed and staggered
 * to avoid a startup thundering herd against SQLite (and reduce contention on all DB types).
 * @param {{ module: { run: Function }, file: string }[]} jobEntries
 */
function startBackgroundJobs (jobEntries) {
  const baseDelayMs = config.get('settings.jobStartupDelaySeconds', 3) * 1000
  let staggerIndex = 0

  for (const { module: job, file } of jobEntries) {
    if (RECONCILE_HEAVY_JOBS.has(file)) {
      const delayMs = baseDelayMs + staggerIndex * JOB_STAGGER_MS
      staggerIndex++
      setTimeout(() => {
        logger.debug(`Starting background job ${file} after ${delayMs}ms startup delay`)
        job.run()
      }, delayMs)
    } else {
      job.run()
    }
  }
}

module.exports = {
  RECONCILE_HEAVY_JOBS,
  startBackgroundJobs
}
