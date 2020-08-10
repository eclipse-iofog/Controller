'use strict'

module.exports = (sequelize, DataTypes) => {
  const RouterConnection = sequelize.define('RouterConnection', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    }
  }, {
    tableName: 'RouterConnections',
    timestamps: true,
    underscored: true
  })
  RouterConnection.associate = function (models) {
    RouterConnection.belongsTo(models.Router, {
      foreignKey: {
        name: 'sourceRouter',
        field: 'source_router'
      },
      as: 'source',
      onDelete: 'cascade'
    })

    RouterConnection.belongsTo(models.Router, {
      foreignKey: {
        name: 'destRouter',
        field: 'dest_router'
      },
      as: 'dest',
      onDelete: 'cascade'
    })
  }
  return RouterConnection
}
