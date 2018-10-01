'use strict';
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
      field: 'straceRun'
    },
    buffer: {
      type: DataTypes.TEXT,
      field: 'buffer',
      defaultValue: '',
    }
  }, {
    timestamps: false,
    underscored: true
  });
  StraceDiagnostics.associate = function(models) {

    StraceDiagnostics.belongsTo(models.Microservice, {
      foreignKey: 'microservice_uuid',
      as: 'microserviceUuid',
      onDelete: 'cascade'

    });
  };
  return StraceDiagnostics;
};