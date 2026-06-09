'use strict'

module.exports = (sequelize, DataTypes) => {
  const RbacRoleRule = sequelize.define('RbacRoleRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id'
    },
    apiGroups: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'api_groups',
      get () {
        const rawValue = this.getDataValue('apiGroups')
        if (!rawValue) return []
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          return []
        }
      },
      set (value) {
        this.setDataValue('apiGroups', JSON.stringify(value))
      }
    },
    resources: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'resources',
      get () {
        const rawValue = this.getDataValue('resources')
        if (!rawValue) return []
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          return []
        }
      },
      set (value) {
        this.setDataValue('resources', JSON.stringify(value))
      }
    },
    verbs: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'verbs',
      get () {
        const rawValue = this.getDataValue('verbs')
        if (!rawValue) return []
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          return []
        }
      },
      set (value) {
        this.setDataValue('verbs', JSON.stringify(value))
      }
    },
    resourceNames: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'resource_names',
      get () {
        const rawValue = this.getDataValue('resourceNames')
        if (!rawValue) return null
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          return null
        }
      },
      set (value) {
        if (value === null || value === undefined) {
          this.setDataValue('resourceNames', null)
        } else {
          this.setDataValue('resourceNames', JSON.stringify(value))
        }
      }
    }
  }, {
    tableName: 'RbacRoleRules',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['role_id']
      }
    ]
  })

  RbacRoleRule.associate = function (models) {
    RbacRoleRule.belongsTo(models.RbacRole, {
      foreignKey: {
        name: 'roleId',
        field: 'role_id'
      },
      as: 'role',
      onDelete: 'CASCADE'
    })
  }

  return RbacRoleRule
}
