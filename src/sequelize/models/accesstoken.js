'use strict';
module.exports = (sequelize, DataTypes) => {
  const AccessToken = sequelize.define('AccessToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    token: {
      type: DataTypes.STRING,
      field: 'token'
    },
    expirationTime: {
      type: DataTypes.BIGINT,
      field: 'expiration_time'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  AccessToken.associate = function (models) {
    AccessToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'userId'
    });
  };
  return AccessToken;
};