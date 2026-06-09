'use strict'

module.exports = (sequelize, DataTypes) => {
  const RbacRole = sequelize.define('RbacRole', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'name',
      unique: true
    },
    kind: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'kind',
      defaultValue: 'Role'
    }
  }, {
    tableName: 'RbacRoles',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      }
    ]
  })

  RbacRole.associate = function (models) {
    RbacRole.hasMany(models.RbacRoleRule, {
      foreignKey: {
        name: 'roleId',
        field: 'role_id'
      },
      as: 'rules',
      onDelete: 'CASCADE'
    })
  }

  return RbacRole
}
