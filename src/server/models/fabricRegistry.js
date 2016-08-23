/**
* @file fabricRegistry.js
* @author Zishan Iqbal
* @description This file includes a iofabric_registry model used by sequalize for ORM;
*/

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Registry from './registry';
import Fabric from './fabric';

const FabricRegistry = sequelize.define('iofabric_registry', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  }, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

Registry.belongsToMany(Fabric, {
  through: FabricRegistry
});

Fabric.belongsToMany(Registry, {
  through: FabricRegistry
});
export default FabricRegistry;
