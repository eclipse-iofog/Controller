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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  StraceDiagnostics.associate = function(models) {
    // associations can be defined here
    StraceDiagnostics.belongsTo(models.Microservice, {
      foreignKey: 'microservice_uuid',
      as: 'microserviceUuid',
      onDelete: 'cascade'

    });
  };
  return StraceDiagnostics;
};