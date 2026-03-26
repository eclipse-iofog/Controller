'use strict'

module.exports = (sequelize, DataTypes) => {
  const RbacServiceAccount = sequelize.define('RbacServiceAccount', {
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
      field: 'name'
    },
    microserviceUuid: {
      type: DataTypes.STRING(36),
      field: 'microservice_uuid',
      allowNull: true
    },
    applicationId: {
      type: DataTypes.INTEGER,
      field: 'application_id',
      allowNull: true
    },
    roleRef: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'role_ref',
      get () {
        const rawValue = this.getDataValue('roleRef')
        if (!rawValue) return null
        try {
          return JSON.parse(rawValue)
        } catch (err) {
          return null
        }
      },
      set (value) {
        if (value === null || value === undefined) {
          this.setDataValue('roleRef', null)
        } else {
          this.setDataValue('roleRef', JSON.stringify(value))
        }
      }
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'role_id'
    }
  }, {
    tableName: 'RbacServiceAccounts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['microserviceUuid']
      },
      {
        unique: true,
        fields: ['applicationId', 'name']
      }
    ]
  })

  RbacServiceAccount.associate = function (models) {
    RbacServiceAccount.belongsTo(models.RbacRole, {
      foreignKey: {
        name: 'roleId',
        field: 'role_id'
      },
      as: 'role'
    })
    RbacServiceAccount.belongsTo(models.Microservice, {
      foreignKey: 'microserviceUuid',
      as: 'microservice'
    })
    RbacServiceAccount.belongsTo(models.Application, {
      foreignKey: 'applicationId',
      as: 'application'
    })
  }

  return RbacServiceAccount
}
