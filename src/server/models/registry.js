/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
* @file registry.js
* @author Zishan Iqbal
* @description This file includes a registry model used by sequalize for ORM;
*/
import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import User from "./user";

const Registry = sequelize.define('registry', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
  url: {type: Sequelize.TEXT, field: 'url'},
    ispublic: {type: Sequelize.BOOLEAN, field: 'is_public'},
  secure: {type: Sequelize.BOOLEAN, field: 'secure'},
  certificate: {type: Sequelize.TEXT, field: 'certificate'},
  requirescert: {type: Sequelize.BOOLEAN, field: 'requires_cert'},
  username: {type: Sequelize.TEXT, field: 'user_name'},
  password: {type: Sequelize.TEXT, field: 'password'},
  useremail: {type: Sequelize.BIGINT, field: 'user_email'},
    user_id: {type: Sequelize.INTEGER, field: 'user_id'}
}, {
  // don't add the timestamp attributes (updatedAt, createdAt)
  timestamps: false,
  // disable the modification of table names
  freezeTableName: true,
  // don't use camelcase for automatically added attributes but underscore style
  // so updatedAt will be updated_at
  underscored: true
});

Registry.belongsTo(User, {
    foreignKey: 'user_id'
});

export default Registry;
