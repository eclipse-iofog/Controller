const databaseProvider = require('../data/providers/database-factory')

function getDbDialect () {
  return databaseProvider.sequelize.getDialect()
}

function supportsSkipLocked () {
  const dialect = getDbDialect()
  return dialect === 'mysql' || dialect === 'postgres'
}

function quoteTableName (tableName, dialect = getDbDialect()) {
  return dialect === 'postgres' ? `"${tableName}"` : `\`${tableName}\``
}

/**
 * Claim the next eligible reconcile task row.
 * sqlite: find + conditional update (serialized by global write queue).
 * mysql/postgres: SELECT … FOR UPDATE SKIP LOCKED, then leader update in same tx.
 */
function buildLeaderOrStaleCondition (staleThreshold, deleteStaleThreshold) {
  const { Op } = require('sequelize')
  const conditions = [
    { leaderUuid: null },
    { claimedAt: { [Op.lt]: staleThreshold } }
  ]
  if (deleteStaleThreshold) {
    conditions.push({
      [Op.and]: [
        { reason: 'delete' },
        { claimedAt: { [Op.lt]: deleteStaleThreshold } }
      ]
    })
  }
  return { [Op.or]: conditions }
}

function buildLeaderOrStaleSql (deleteStaleThreshold) {
  if (!deleteStaleThreshold) {
    return '(leader_uuid IS NULL OR claimed_at < :staleThreshold)'
  }
  return '(leader_uuid IS NULL OR claimed_at < :staleThreshold OR (reason = \'delete\' AND claimed_at < :deleteStaleThreshold))'
}

async function claimNextReconcileTask ({
  Entity,
  controllerUuid,
  staleThreshold,
  deleteStaleThreshold = null,
  now,
  activeStatuses,
  includeNextAttemptFilter = true,
  selectSql,
  reloadTask
}) {
  const { runInTransaction, PRIORITY_BACKGROUND } = require('./transaction-runner')
  const { Op } = require('sequelize')
  const sequelize = databaseProvider.sequelize

  const leaderOrStale = buildLeaderOrStaleCondition(staleThreshold, deleteStaleThreshold)

  const baseWhere = {
    status: { [Op.in]: activeStatuses },
    [Op.and]: [leaderOrStale]
  }

  if (includeNextAttemptFilter) {
    baseWhere[Op.or] = [
      { nextAttemptAt: null },
      { nextAttemptAt: { [Op.lte]: now } }
    ]
  }

  return runInTransaction(async (transaction) => {
    let task

    if (supportsSkipLocked()) {
      const dialect = getDbDialect()
      const tableName = Entity.getTableName()
      const quotedTable = quoteTableName(tableName, dialect)

      const nextAttemptClause = includeNextAttemptFilter
        ? 'AND (next_attempt_at IS NULL OR next_attempt_at <= :now)'
        : ''

      const leaderOrStaleSql = buildLeaderOrStaleSql(deleteStaleThreshold)
      const rows = await sequelize.query(
        `${selectSql.replace(':table', quotedTable)}
         WHERE status IN (:activeStatuses)
           ${nextAttemptClause}
           AND ${leaderOrStaleSql}
         ORDER BY id ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        {
          replacements: {
            activeStatuses,
            now,
            staleThreshold,
            deleteStaleThreshold
          },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      )

      if (!rows.length) {
        return null
      }
      task = Entity.build(rows[0], { isNewRecord: false })
    } else {
      task = await Entity.findOne({
        where: baseWhere,
        order: [['id', 'ASC']],
        limit: 1,
        transaction
      })
      if (!task) {
        return null
      }
    }

    const [affected] = await Entity.update(
      { leaderUuid: controllerUuid, claimedAt: new Date(), status: 'in_progress' },
      {
        where: {
          id: task.id,
          ...buildLeaderOrStaleCondition(staleThreshold, deleteStaleThreshold)
        },
        transaction
      }
    )
    if (affected === 0) {
      return null
    }

    if (reloadTask) {
      return reloadTask(task.id, transaction)
    }

    return Entity.findOne({ where: { id: task.id }, transaction })
  }, { priority: PRIORITY_BACKGROUND, label: 'reconcileTask.claim' })
}

module.exports = {
  getDbDialect,
  supportsSkipLocked,
  quoteTableName,
  claimNextReconcileTask
}
