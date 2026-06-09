'use strict'

module.exports = (sequelize, DataTypes) => {
  const NatsAccount = sequelize.define('NatsAccount', {
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
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'public_key'
    },
    jwt: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'jwt'
    },
    seedSecretName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'seed_secret_name'
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_system',
      defaultValue: false
    },
    isLeafSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_leaf_system',
      defaultValue: false
    },
    operatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'operator_id'
    },
    applicationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'application_id'
    }
  }, {
    tableName: 'NatsAccounts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['application_id']
      }
    ]
  })

  NatsAccount.associate = function (models) {
    NatsAccount.belongsTo(models.NatsOperator, {
      foreignKey: {
        name: 'operatorId',
        field: 'operator_id'
      },
      as: 'operator',
      onDelete: 'cascade'
    })

    NatsAccount.belongsTo(models.Application, {
      foreignKey: {
        name: 'applicationId',
        field: 'application_id'
      },
      as: 'application',
      onDelete: 'cascade'
    })

    NatsAccount.hasMany(models.NatsUser, {
      foreignKey: 'account_id',
      as: 'users'
    })
  }

  return NatsAccount
}
