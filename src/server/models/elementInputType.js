/**
 * @file element.js
 * @author Zishan Iqbal
 * @description This file includes a element_input_type model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Element from './element';

const ElementInputType = sequelize.define('element_input_type', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  elementKey: {
    type: Sequelize.BIGINT,
    field: 'element_key'
  },
  infoType: {
    type: Sequelize.TEXT,
    field: 'info_type'
  },
  infoFormat: {
    type: Sequelize.TEXT,
    field: 'info_format'
  },

}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

ElementInputType.belongsTo(Element);

export default ElementInputType;