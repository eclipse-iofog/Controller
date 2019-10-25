'use strict'

const { convertToInt } = require('../../helpers/app-helper')

module.exports = (sequelize, DataTypes) => {
  const FogProvisionKey = sequelize.define('FogProvisionKey', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    provisionKey: {
      /* eslint-disable new-cap */
      type: DataTypes.STRING(100),
      field: 'provisioning_string'
    },
    expirationTime: {
      type: DataTypes.BIGINT,
      get () {
        return convertToInt(this.getDataValue('expirationTime'))
      },
      field: 'expiration_time'
    }
  }, {
    tableName: 'FogProvisionKeys',
    timestamps: false,
    underscored: true
  })
  FogProvisionKey.associate = function (models) {
    FogProvisionKey.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'cascade'
    })
  }
  return FogProvisionKey
}
