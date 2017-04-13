/**
 * @file element.js
 * @author Zishan Iqbal
 * @description This file includes a element model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Registry from './registry';

const Element = sequelize.define('element', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  name: {
    type: Sequelize.TEXT,
    field: 'name'
  },
  description: {
    type: Sequelize.TEXT,
    field: 'description'
  },
  category: {
    type: Sequelize.TEXT,
    field: 'category'
  },
  config: {
    type: Sequelize.TEXT,
    field: 'config'
  },
  containerImage: {
    type: Sequelize.TEXT,
    field: 'container_image'
  },
  publisher: {
    type: Sequelize.TEXT,
    field: 'publisher'
  },
  diskRequired: {
    type: Sequelize.BIGINT,
    field: 'diskRequired'
  },
  ramRequired: {
    type: Sequelize.BIGINT,
    field: 'ram_required'
  },
  picture: {
    type: Sequelize.BIGINT,
    field: 'picture'
  },
  isPublic: {
    type: Sequelize.BOOLEAN,
    field: 'is_public'
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

Element.belongsTo(Registry);

export default Element;