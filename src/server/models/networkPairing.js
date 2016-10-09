/**
 * @file networkPairing.js
 * @author Zishan Iqbal
 * @description This file includes a networkPairing model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Fabric from './fabric';
import ElementInstance from './elementInstance';
import ElementInstancePort from './elementInstancePort';

const NetworkPairing = sequelize.define('network_pairing', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  isPublicPort: {
    type: Sequelize.BOOLEAN,
    field: 'IsPublicPort'
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

NetworkPairing.belongsTo(Fabric, {
  foreignKey: 'InstanceId1',
  as: 'instanceId1'
});
NetworkPairing.belongsTo(Fabric, {
  foreignKey: 'InstanceId2',
  as: 'instanceId2'
});
NetworkPairing.belongsTo(ElementInstance, {
  foreignKey: 'ElementId1',
  as: 'elementId1',
  targetKey: 'uuid'
});
NetworkPairing.belongsTo(ElementInstance, {
  foreignKey: 'ElementId2',
  as: 'elementId2',
  targetKey: 'uuid'
});
NetworkPairing.belongsTo(ElementInstance, {
  foreignKey: 'NetworkElementId1',
  as: 'networkElementId1',
  targetKey: 'uuid'
});
NetworkPairing.belongsTo(ElementInstance, {
  foreignKey: 'NetworkElementId2',
  as: 'networkElementId2',
  targetKey: 'uuid'
});
NetworkPairing.belongsTo(ElementInstancePort, {
  foreignKey: 'Elemen1PortId',
  as: 'element1PortId'
});
NetworkPairing.belongsTo(SatellitePort, {
  foreignKey: 'SatellitePortId',
  as: 'satellitePortId'
});

export default NetworkPairing;