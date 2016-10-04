/**
 * @file ioElementFebricType.js
 * @author Zishan Iqbal
 * @description This file includes a IOElementFebricType model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Element from './element';
import FabricType from './fabricType';

const ElementFabricType = sequelize.define('element_fabric_types', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
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

ElementFabricType.belongsTo(Element);
ElementFabricType.belongsTo(FabricType);

export default ElementFabricType;