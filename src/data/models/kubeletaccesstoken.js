'use strict'
module.exports = (sequelize, DataTypes) => {
  const KubeletAccessToken = sequelize.define('KubeletAccessToken', {
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
    timestamps: false,
    underscored: true
  })
  KubeletAccessToken.associate = function (models) {
    KubeletAccessToken.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'cascade'
    })
  }
  return KubeletAccessToken
}
