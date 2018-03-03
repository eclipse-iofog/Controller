/**
 * @file elementInstance.js
 * @author Zishan Iqbal
 * @description This file includes a element_instance model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Fog from './fog';
import Element from './element'

const ElementInstance = sequelize.define('element_instance', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  uuid: {
    type: Sequelize.TEXT,
    field: 'UUID'
  },
  trackId: {
    type: Sequelize.BIGINT,
    field: 'track_id'
  },
  config: {
    type: Sequelize.TEXT,
    field: 'config'
  },
  name: {
    type: Sequelize.TEXT,
    field: 'name'
  },
  updatedBy: {
    type: Sequelize.BIGINT,
    field: 'updated_by'
  },
  configLastUpdated: {
    type: Sequelize.BIGINT,
    field: 'config_last_updated'
  },
  isStreamViewer: {
    type: Sequelize.BOOLEAN,
    field: 'is_stream_viewer'
  },
  isDebugConsole: {
    type: Sequelize.BOOLEAN,
    field: 'is_debug_console'
  },
  isManager: {
    type: Sequelize.BOOLEAN,
    field: 'is_manager'
  },
  isNetwork: {
    type: Sequelize.BOOLEAN,
    field: 'is_network'
  },
  registryId: {
    type: Sequelize.BIGINT,
    field: 'registry_id'
  },
  rebuild: {
    type: Sequelize.BOOLEAN,
    field: 'rebuild'
  },
  rootHostAccess: {
    type: Sequelize.BOOLEAN,
    field: 'root_host_access'
  },
  logSize: {
    type: Sequelize.BIGINT,
    field: 'log_size'
  },
  volumeMappings: {
    type: Sequelize.TEXT,
    field: 'volume_mappings'
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

ElementInstance.belongsTo(Element, {
  foreignKey: 'element_key'
});
ElementInstance.belongsTo(Fog, {
  foreignKey: 'iofog_uuid'
});
export default ElementInstance;