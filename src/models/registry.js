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
const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const User = require('./user');

const Registry = sequelize.define('registry', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'id'},
    url: {type: Sequelize.TEXT, field: 'url'},
    isPublic: {type: Sequelize.BOOLEAN, field: 'is_public'},
    secure: {type: Sequelize.BOOLEAN, field: 'secure'},
    certificate: {type: Sequelize.TEXT, field: 'certificate'},
    requiresCert: {type: Sequelize.BOOLEAN, field: 'requires_cert'},
    username: {type: Sequelize.TEXT, field: 'user_name'},
    password: {type: Sequelize.TEXT, field: 'password'},
    userEmail: {type: Sequelize.TEXT, field: 'user_email'},
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
    foreignKey: 'user_id',
    as: 'userId'
});

module.exports = Registry;
