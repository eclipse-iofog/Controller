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

const Sequelize = require('sequelize');
const Microservice = require('./microservice');
const sequelize = require('../utils/sequelize');

module.exports = function (sequelize, DataTypes) {
    const StraceDiagnostics = sequelize.define('strace_diagnostics', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        straceRun: {
            type: DataTypes.BOOLEAN,
            field: 'straceRun'
        },
        buffer: {
            type: DataTypes.TEXT,
            field: 'buffer',
            defaultValue: '',
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

    StraceDiagnostics.associate = function (models) {

        StraceDiagnostics.belongsTo(models.Microservice, {
            foreignKey: 'microservice_uuid',
            as: 'microserviceUuid',
            onDelete: 'cascade'

        });
    };

    return StraceDiagnostics;
};