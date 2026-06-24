/**
 * Apply production SQLite pragmas (WAL, busy_timeout, synchronous).
 * @param {import('sequelize').Sequelize} sequelize
 * @param {{ journalMode?: string, busyTimeoutMs?: number, synchronous?: string }} [pragmaConfig]
 */
async function applySqlitePragmas (sequelize, pragmaConfig = {}) {
  const journalMode = pragmaConfig.journalMode != null ? pragmaConfig.journalMode : 'WAL'
  const busyTimeoutMs = pragmaConfig.busyTimeoutMs != null ? pragmaConfig.busyTimeoutMs : 10000
  const synchronous = pragmaConfig.synchronous != null ? pragmaConfig.synchronous : 'NORMAL'

  if (journalMode) {
    await sequelize.query(`PRAGMA journal_mode = ${journalMode}`)
  }
  if (busyTimeoutMs > 0) {
    await sequelize.query(`PRAGMA busy_timeout = ${busyTimeoutMs}`)
  }
  if (synchronous) {
    await sequelize.query(`PRAGMA synchronous = ${synchronous}`)
  }
}

function runOnConnection (connection, sql) {
  return new Promise((resolve, reject) => {
    if (typeof connection.run !== 'function') {
      reject(new Error('Unsupported SQLite connection for pragma setup'))
      return
    }
    connection.run(sql, (err) => (err ? reject(err) : resolve()))
  })
}

/**
 * Register afterConnect hook so pragmas apply when the pool opens a new connection.
 * @param {import('sequelize').Sequelize} sequelize
 * @param {{ journalMode?: string, busyTimeoutMs?: number, synchronous?: string }} [pragmaConfig]
 */
function registerSqlitePragmas (sequelize, pragmaConfig = {}) {
  const journalMode = pragmaConfig.journalMode != null ? pragmaConfig.journalMode : 'WAL'
  const busyTimeoutMs = pragmaConfig.busyTimeoutMs != null ? pragmaConfig.busyTimeoutMs : 10000
  const synchronous = pragmaConfig.synchronous != null ? pragmaConfig.synchronous : 'NORMAL'

  sequelize.addHook('afterConnect', async (connection) => {
    if (journalMode) {
      await runOnConnection(connection, `PRAGMA journal_mode = ${journalMode}`)
    }
    if (busyTimeoutMs > 0) {
      await runOnConnection(connection, `PRAGMA busy_timeout = ${busyTimeoutMs}`)
    }
    if (synchronous) {
      await runOnConnection(connection, `PRAGMA synchronous = ${synchronous}`)
    }
  })
}

module.exports = {
  applySqlitePragmas,
  registerSqlitePragmas
}
