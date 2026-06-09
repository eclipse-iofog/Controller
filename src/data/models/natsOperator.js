'use strict'

module.exports = (sequelize, DataTypes) => {
  const NatsOperator = sequelize.define('NatsOperator', {
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
    }
  }, {
    tableName: 'NatsOperators',
    timestamps: true,
    underscored: true
  })

  NatsOperator.associate = function (models) {
    NatsOperator.hasMany(models.NatsAccount, {
      foreignKey: 'operator_id',
      as: 'accounts'
    })
  }

  return NatsOperator
}
