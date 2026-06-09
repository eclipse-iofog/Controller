'use strict'

module.exports = (sequelize, DataTypes) => {
  const NatsUser = sequelize.define('NatsUser', {
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
    credsSecretName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'creds_secret_name'
    },
    isBearer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_bearer',
      defaultValue: false
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'account_id'
    },
    microserviceUuid: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'microservice_uuid'
    },
    natsUserRuleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'nats_user_rule_id'
    }
  }, {
    tableName: 'NatsUsers',
    timestamps: true,
    underscored: true
  })

  NatsUser.associate = function (models) {
    NatsUser.belongsTo(models.NatsAccount, {
      foreignKey: {
        name: 'accountId',
        field: 'account_id'
      },
      as: 'account',
      onDelete: 'cascade'
    })

    NatsUser.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'set null'
    })

    NatsUser.belongsTo(models.NatsUserRule, {
      foreignKey: {
        name: 'natsUserRuleId',
        field: 'nats_user_rule_id'
      },
      as: 'natsUserRule',
      onDelete: 'set null'
    })
  }

  return NatsUser
}
