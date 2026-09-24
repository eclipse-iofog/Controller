'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceEntrypoint = sequelize.define('MicroserviceEntrypoint', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    entrypoint: {
      type: DataTypes.TEXT,
      field: 'entrypoint'
    }
  }, {
    tableName: 'MicroserviceEntrypoints',
    timestamps: false,
    underscored: true
  })
  MicroserviceEntrypoint.associate = function (models) {
    MicroserviceEntrypoint.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceEntrypoint
}
