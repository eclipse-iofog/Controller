'use strict'
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
      field: 'expiration_time'
    }
  }, {
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
