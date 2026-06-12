'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthUserGroup = sequelize.define('AuthUserGroup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'user_id'
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'group_id'
    }
  }, {
    tableName: 'AuthUserGroups',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id', 'group_id'] },
      { fields: ['user_id'] },
      { fields: ['group_id'] }
    ]
  })

  AuthUserGroup.associate = function (models) {
    AuthUserGroup.belongsTo(models.AuthUser, {
      foreignKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'user',
      onDelete: 'CASCADE'
    })
    AuthUserGroup.belongsTo(models.AuthGroup, {
      foreignKey: {
        name: 'groupId',
        field: 'group_id'
      },
      as: 'group',
      onDelete: 'CASCADE'
    })
  }

  return AuthUserGroup
}
