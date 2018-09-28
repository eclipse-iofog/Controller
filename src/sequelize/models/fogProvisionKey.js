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
 * @file fogProvisionKey.js
 * @author Zishan Iqbal
 * @description This file includes a iofog_provision_keys model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Fog = require('./fog');

module.exports = function (sequelize, DataTypes) {
    const FogProvisionKey = sequelize.define('iofog_provision_keys', {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id'},
        provisionKey: {type: DataTypes.STRING(100), field: 'provisioning_string'},
        expirationTime: {type: DataTypes.BIGINT, field: 'expiration_time'}
    }, {
        // don't add the timestamp attributes (updatedAt, createdAt)
        timestamps: false,
        // disable the modification of table names
        freezeTableName: true,
        // don't use camelcase for automatically added attributes but underscore style
        // so updatedAt will be updated_at
        underscored: true
    });

     FogProvisionKey.associate = function (models) {

         FogProvisionKey.belongsTo(models.Fog, {
            foreignKey: 'iofog_uuid',
            as: 'iofogUuid',
            onDelete: 'cascade'
        });
     };

     return FogProvisionKey;
};
