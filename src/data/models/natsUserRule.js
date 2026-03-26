'use strict'

const AppHelper = require('../../helpers/app-helper')

function _bigIntGetter (field) {
  return function () {
    const raw = this.getDataValue(field)
    return AppHelper.convertToInt(raw, null)
  }
}

function _bigIntSetter (field) {
  return function (value) {
    const n = value == null ? null : parseInt(value, 10)
    this.setDataValue(field, (n != null && !isNaN(n)) ? n : null)
  }
}

module.exports = (sequelize, DataTypes) => {
  const NatsUserRule = sequelize.define('NatsUserRule', {
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
      unique: true,
      field: 'name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description'
    },
    maxSubscriptions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_subscriptions'
    },
    maxPayload: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_payload'
    },
    maxData: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'max_data',
      get: _bigIntGetter('maxData'),
      set: _bigIntSetter('maxData')
    },
    bearerToken: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'bearer_token',
      defaultValue: false
    },
    proxyRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'proxy_required'
    },
    allowedConnectionTypes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'allowed_connection_types'
    },
    src: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'src'
    },
    times: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'times'
    },
    timesLocation: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'times_location'
    },
    respMax: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'resp_max'
    },
    respTtl: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'resp_ttl',
      get: _bigIntGetter('respTtl'),
      set: _bigIntSetter('respTtl')
    },
    pubAllow: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'pub_allow'
    },
    pubDeny: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'pub_deny'
    },
    subAllow: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'sub_allow'
    },
    subDeny: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'sub_deny'
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'tags'
    }
  }, {
    tableName: 'NatsUserRules',
    timestamps: true,
    underscored: true
  })

  NatsUserRule.associate = function (models) {
    NatsUserRule.hasMany(models.Microservice, {
      foreignKey: {
        name: 'natsRuleId',
        field: 'nats_rule_id'
      },
      as: 'microservices'
    })
  }

  return NatsUserRule
}
