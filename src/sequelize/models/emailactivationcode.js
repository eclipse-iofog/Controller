'use strict';
module.exports = (sequelize, DataTypes) => {
  const EmailActivationCode = sequelize.define('EmailActivationCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    activationCode: {
      type: DataTypes.TEXT,
      field: 'activation_code'
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
  EmailActivationCode.associate = function(models) {
    // associations can be defined here
    EmailActivationCode.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'userId',
      onDelete: 'cascade'
    });
  };
  return EmailActivationCode;
};