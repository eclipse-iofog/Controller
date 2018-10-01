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
    },
    userAccessToken: {
      type: DataTypes.TEXT,
      field: 'user_access_token'
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
  User.associate = function(models) {
    // associations can be defined here

  };
  return User;
};