'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
      field: 'id'
    },
    firstName: {
      type: DataTypes.STRING(100),
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING(100),
      field: 'last_name'
    },
    email: {
      type: DataTypes.STRING(100),
      field: 'email'
    },
    password: {
      type: DataTypes.STRING(100),
      field: 'password'
    },
    tempPassword: {
      type: DataTypes.STRING(100),
      field: 'temp_password'
    },
    emailActivated: {
      type: DataTypes.BOOLEAN,
      field: 'email_activated'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  User.associate = function(models) {

    User.hasOne(models.AccessToken, {
      foreignKey: 'user_id',
      as: 'accessToken'
    });

  };
  return User;
};