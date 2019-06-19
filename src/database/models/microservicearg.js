'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceArg = sequelize.define('MicroserviceArg', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id',
    },
    cmd: {
      type: DataTypes.TEXT,
      field: 'cmd',
    },
  }, {
    timestamps: false,
    underscored: true,
  })
  MicroserviceArg.associate = function(models) {
    MicroserviceArg.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid',
      },
      as: 'microservice',
      onDelete: 'cascade',
    })
  }
  return MicroserviceArg
}
