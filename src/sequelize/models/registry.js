'use strict';
module.exports = (sequelize, DataTypes) => {
  const Registry = sequelize.define('Registry', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    url: {
      type: DataTypes.TEXT,
      field: 'url'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      field: 'is_public'
    },
    secure: {
      type: DataTypes.BOOLEAN,
      field: 'secure'
    },
    certificate: {
      type: DataTypes.TEXT,
      field: 'certificate'
    },
    requiresCert: {
      type: DataTypes.BOOLEAN,
      field: 'requires_cert'
    },
    username: {
      type: DataTypes.TEXT,
      field: 'user_name'
    },
    password: {
      type: DataTypes.TEXT,
      field: 'password'
    },
    userEmail: {
      type: DataTypes.TEXT,
      field: 'user_email'
    }
  }, {
    timestamps: false,
    freezeTableName: true,
    underscored: true
  });
  Registry.associate = function(models) {

    Registry.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'userId'
    });
  };
  return Registry;
};