'use strict';
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
      type: DataTypes.STRING(100),
      field: 'provisioning_string'
    },
    expirationTime: {
      type: DataTypes.BIGINT,
      field: 'expiration_time'
    }
  }, {
    timestamps: false,
    freezeTableName: true,
    underscored: true
  });
  FogProvisionKey.associate = function(models) {

    FogProvisionKey.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofogUuid',
      onDelete: 'cascade'
    });
  };
  return FogProvisionKey;
};