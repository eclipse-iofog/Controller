const BaseManager = require('./base-manager')
const models = require('../models')
const config = require('../../config')
const databaseProvider = require('../providers/database-factory')
const { Op } = require('sequelize')

class NatsReconcileTaskManager extends BaseManager {
  getEntity () {
    return models.NatsReconcileTask
  }

  async claimNext (controllerUuid, stalenessSeconds) {
    const sequelize = databaseProvider.sequelize
    const T = stalenessSeconds != null ? stalenessSeconds : config.get('settings.natsReconcileTaskStalenessSeconds', 900)
    const staleThreshold = new Date(Date.now() - T * 1000)
    const Entity = this.getEntity()
    return sequelize.transaction(async (transaction) => {
      const task = await Entity.findOne({
        where: {
          status: { [Op.in]: ['pending', 'in_progress'] },
          [Op.or]: [
            { leaderUuid: null },
            { claimedAt: { [Op.lt]: staleThreshold } }
          ]
        },
        order: [['id', 'ASC']],
        limit: 1,
        transaction
      })
      if (!task) return null
      const [affected] = await Entity.update(
        { leaderUuid: controllerUuid, claimedAt: new Date(), status: 'in_progress' },
        {
          where: {
            id: task.id,
            [Op.or]: [
              { leaderUuid: null },
              { claimedAt: { [Op.lt]: staleThreshold } }
            ]
          },
          transaction
        }
      )
      if (affected === 0) return null
      return this.findOne({ id: task.id }, transaction)
    })
  }
}

module.exports = new NatsReconcileTaskManager()
