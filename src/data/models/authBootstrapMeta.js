'use strict'

module.exports = (sequelize, DataTypes) => {
  const AuthBootstrapMeta = sequelize.define('AuthBootstrapMeta', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    bootstrapAdminUserId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'bootstrap_admin_user_id'
    }
  }, {
    tableName: 'AuthBootstrapMeta',
    timestamps: true,
    underscored: true
  })

  AuthBootstrapMeta.associate = function (models) {
    AuthBootstrapMeta.belongsTo(models.AuthUser, {
      foreignKey: {
        name: 'bootstrapAdminUserId',
        field: 'bootstrap_admin_user_id'
      },
      as: 'bootstrapAdminUser',
      onDelete: 'SET NULL'
    })
  }

  return AuthBootstrapMeta
}
