'use strict'

module.exports = (sequelize, DataTypes) => {
  const RbacRoleBinding = sequelize.define('RbacRoleBinding', {
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
      defaultValue: 'RoleBinding'
    },
    roleRef: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'role_ref',
      get () {
        const rawValue = this.getDataValue('roleRef')
        if (!rawValue) return {}
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          return {}
        }
      },
      set (value) {
        this.setDataValue('roleRef', JSON.stringify(value))
      }
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'role_id'
    },
    subjects: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'subjects',
      get () {
        const rawValue = this.getDataValue('subjects')
        if (!rawValue) return []
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          return []
        }
      },
      set (value) {
        this.setDataValue('subjects', JSON.stringify(value))
      }
    }
  }, {
    tableName: 'RbacRoleBindings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      }
    ]
  })

  RbacRoleBinding.associate = function (models) {
    RbacRoleBinding.belongsTo(models.RbacRole, {
      foreignKey: {
        name: 'roleId',
        field: 'role_id'
      },
      as: 'role'
    })
  }

  return RbacRoleBinding
}
