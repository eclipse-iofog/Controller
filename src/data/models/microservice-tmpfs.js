'use strict'
module.exports = (sequelize, DataTypes) => {
  const MicroserviceTmpfs = sequelize.define('MicroserviceTmpfs', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    containerPath: {
      type: DataTypes.TEXT,
      field: 'container_path'
    },
    size: {
      type: DataTypes.FLOAT,
      field: 'size'
    },
    mode: {
      type: DataTypes.TEXT,
      field: 'mode'
    }
  }, {
    tableName: 'MicroserviceTmpfs',
    timestamps: false,
    underscored: true
  })
  MicroserviceTmpfs.associate = function (models) {
    MicroserviceTmpfs.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    })
  }
  return MicroserviceTmpfs
}
