'use strict';
module.exports = (sequelize, DataTypes) => {
  const FogAccessToken = sequelize.define('FogAccessToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    expirationTime: {
      type: DataTypes.BIGINT,
      field: 'expiration_time'
    },
    token: {
      type: DataTypes.TEXT,
      field: 'token'
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
  FogAccessToken.associate = function(models) {
    // associations can be defined here
    FogAccessToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'userId',
      onDelete: 'cascade'
    });

    FogAccessToken.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofogUuid',
      onDelete: 'cascade'
    });
  };
  return FogAccessToken;
};