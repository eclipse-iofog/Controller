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
 * @author elukashick
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Microservice = require('./microservice');

module.exports = function (sequelize, DataTypes) {
    const MicroserviceStatus = sequelize.define('microservice_status', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        status: {
            type: DataTypes.TEXT,
            field: 'status'
        },
        cpuUsage: {
            type: DataTypes.FLOAT,
            defaultValue: 0.000,
            field: 'cpu_usage'
        },
        memoryUsage: {
            type: DataTypes.BIGINT,
            defaultValue: 0,
            field: 'memory_usage'
        },
        containerId: {
            type: DataTypes.TEXT,
            field: 'container_id'
        }
    }, {
        // add the timestamp attributes (updatedAt, createdAt)
        timestamps: true,
        // disable the modification of table names
        freezeTableName: true,
        // don't use camelcase for automatically added attributes but underscore style
        // so updatedAt will be updated_at
        underscored: true
    });

    MicroserviceStatus.associate = function (models) {

        MicroserviceStatus.belongsTo(models.Microservice, {
            foreignKey: 'microservice_uuid',
            as: 'microserviceUuid',
            onDelete: 'cascade'
        });
    };


    return MicroserviceStatus;
};