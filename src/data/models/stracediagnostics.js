'use strict'
module.exports = (sequelize, DataTypes) => {
  const StraceDiagnostics = sequelize.define('StraceDiagnostics', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    straceRun: {
      type: DataTypes.BOOLEAN,
      field: 'strace_run'
    },
    buffer: {
      type: DataTypes.TEXT,
      field: 'buffer',
      defaultValue: ''
    }
  }, {
    tableName: 'StraceDiagnostics',
    timestamps: false,
    underscored: true
  })
  StraceDiagnostics.associate = function (models) {
    StraceDiagnostics.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'

    })
  }
  return StraceDiagnostics
}
