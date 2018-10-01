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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  FogProvisionKey.associate = function(models) {
    // associations can be defined here
    FogProvisionKey.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofogUuid',
      onDelete: 'cascade'
    });
  };
  return FogProvisionKey;
};