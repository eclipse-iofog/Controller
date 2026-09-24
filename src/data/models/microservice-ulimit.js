'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceUlimit = sequelize.define('MicroserviceUlimit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.TEXT,
      field: 'name',
      allowNull: false
    },
    soft: {
      type: DataTypes.FLOAT,
      field: 'soft'
    },
    hard: {
      type: DataTypes.FLOAT,
      field: 'hard'
    }
  }, {
    tableName: 'MicroserviceUlimits',
    timestamps: false,
    underscored: true
  })
  MicroserviceUlimit.associate = function (models) {
    MicroserviceUlimit.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceUlimit
}
