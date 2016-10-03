/**
 * @file satellitejs
 * @author Zishan Iqbal
 * @description
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const Satellite = sequelize.define('satellite', {
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
  domain: {
    type: Sequelize.TEXT,
    field: 'domain'
  },
  publicIP: {
    type: Sequelize.TEXT,
    field: 'public_ip'
  }
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: true,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

export default Satellite;