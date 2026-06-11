'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthGroup = sequelize.define('AuthGroup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'name'
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_system'
    }
  }, {
    tableName: 'AuthGroups',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['name'] }
    ]
  })

  AuthGroup.associate = function (models) {
    AuthGroup.belongsToMany(models.AuthUser, {
      through: models.AuthUserGroup,
      foreignKey: {
        name: 'groupId',
        field: 'group_id'
      },
      otherKey: {
        name: 'userId',
        field: 'user_id'
      },
      as: 'users'
    })
  }

  return AuthGroup
}
