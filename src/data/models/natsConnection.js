'use strict'

module.exports = (sequelize, DataTypes) => {
  const NatsConnection = sequelize.define('NatsConnection', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    }
  }, {
    tableName: 'NatsConnections',
    timestamps: true,
    underscored: true
  })

  NatsConnection.associate = function (models) {
    NatsConnection.belongsTo(models.NatsInstance, {
      foreignKey: {
        name: 'sourceNats',
        field: 'source_nats'
      },
      as: 'source',
      onDelete: 'cascade'
    })

    NatsConnection.belongsTo(models.NatsInstance, {
      foreignKey: {
        name: 'destNats',
        field: 'dest_nats'
      },
      as: 'dest',
      onDelete: 'cascade'
    })
  }

  return NatsConnection
}
