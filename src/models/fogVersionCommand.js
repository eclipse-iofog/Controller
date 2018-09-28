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
 * @file fogVersionCommand.js
 * @author Maksim Chepelev
 * @description This file includes a iofog_version_commands model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Fog = require('./fog');

const FogVersionCommand = sequelize.define('iofog_version_command', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'id'},
    versionCommand: {type: Sequelize.STRING(100), field: 'version_command'},
}, {
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
});

FogVersionCommand.belongsTo(Fog, {
    foreignKey: 'iofog_uuid',
    as: 'iofogUuid',
    onDelete: 'cascade'
});

module.exports = FogVersionCommand;