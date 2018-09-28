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
 * @file tunnel.js
 * @author epankov
 * @description This file includes a proxy model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Fog = require('./fog');

module.exports = function (sequelize, DataTypes) {
    const Tunnel = sequelize.define('proxy', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        username: {
            type: DataTypes.TEXT,
            field: 'username'
        },
        password: {
            type: DataTypes.TEXT,
            field: 'password'
        },
        host: {
            type: DataTypes.TEXT,
            field: 'host'
        },
        rport: {
            type: DataTypes.INTEGER,
            field: 'remote_port'
        },
        lport: {
            type: DataTypes.INTEGER,
            defaultValue: 22,
            field: 'local_port'
        },
        rsakey: {
            type: DataTypes.TEXT,
            field: 'rsa_key'
        },
        close: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'close'
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

    Tunnel.associate = function (models) {

        Tunnel.belongsTo(models.Fog, {
            foreignKey: 'iofog_uuid',
            as: 'iofogUuid',
            onDelete: 'cascade'
        });
    };


    return Tunnel;
};