'use strict'
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
      /* eslint-disable new-cap */
      type: DataTypes.STRING(100),
      field: 'first_name',
      defaultValue: ''
    },
    lastName: {
      /* eslint-disable new-cap */
      type: DataTypes.STRING(100),
      field: 'last_name',
      defaultValue: ''
    },
    email: {
      /* eslint-disable new-cap */
      type: DataTypes.STRING(100),
      field: 'email',
      defaultValue: ''
    },
    password: {
      /* eslint-disable new-cap */
      type: DataTypes.STRING(100),
      field: 'password'
    },
    tempPassword: {
      /* eslint-disable new-cap */
      type: DataTypes.STRING(100),
      field: 'temp_password'
    },
    emailActivated: {
      type: DataTypes.BOOLEAN,
      field: 'email_activated',
      defaultValue: false
    }
  }, {
    tableName: 'Users',
    timestamps: false,
    underscored: true
  })
  User.associate = function (models) {
    User.hasOne(models.AccessToken, {
      foreignKey: 'user_id',
      as: 'accessToken'
    })

    User.hasMany(models.Application, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'application'
    })

    User.hasMany(models.Fog, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'fog'
    })

    User.hasMany(models.Microservice, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'microservice'
    })
  }
  return User
}
