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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  Registry.associate = function(models) {
    // associations can be defined here
    Registry.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'userId'
    });
  };
  return Registry;
};