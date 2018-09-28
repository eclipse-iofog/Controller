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
 * @file fog.js
 * @author Zishan Iqbal
 * @description This file includes a iofogs model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const FogType = require('./fogType');
const User = require('./user');

const Fog = sequelize.define('iofogs', {
    uuid: {
        type: Sequelize.TEXT,
        primaryKey: true,
        field: 'uuid'
    },
    name: {
        type: Sequelize.TEXT,
        defaultValue: "Unnamed ioFog 1",
        field: 'name'
    },
    location: {
        type: Sequelize.TEXT,
        field: 'location'
    },
    gpsMode: {
        type: Sequelize.TEXT,
        field: 'gps_mode'
    },
    latitude: {
        type: Sequelize.TEXT,
        field: 'latitude'
    },
    longitude: {
        type: Sequelize.TEXT,
        field: 'longitude'
    },
    description: {
        type: Sequelize.TEXT,
        field: 'description'
    },
    lastactive: {
        type: Sequelize.BIGINT,
        field: 'last_active'
    },
    daemonStatus: {
        type: Sequelize.TEXT,
        defaultValue: "UNKNOWN",
        field: 'daemon_status'
    },
    daemonOperatingDuration: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'daemon_operating_duration'
    },
    daemonLastStart: {
        type: Sequelize.BIGINT,
        field: 'daemon_last_start'
    },
    memoryUsage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.000,
        field: 'memory_usage'
    },
    diskUsage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.000,
        field: 'disk_usage'
    },
    cpuUsage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.00,
        field: 'cpu_usage'
    },
    memoryViolation: {
        type: Sequelize.TEXT,
        field: 'memory_violation'
    },
    diskViolation: {
        type: Sequelize.TEXT,
        field: 'disk_violation'
    },
    cpuViolation: {
        type: Sequelize.TEXT,
        field: 'cpu_violation'
    },
    catalogItemStatus: {
        type: Sequelize.TEXT,
        field: 'catalog_item_status'
    },
    repositoryCount: {
        type: Sequelize.BIGINT,
        field: 'repository_count'
    },
    repositoryStatus: {
        type: Sequelize.TEXT,
        field: 'repository_status'
    },
    systemTime: {
        type: Sequelize.BIGINT,
        field: 'system_time'
    },
    lastStatusTime: {
        type: Sequelize.BIGINT,
        field: 'last_status_time'
    },
    ipAddress: {
        type: Sequelize.TEXT,
        defaultValue: "0.0.0.0",
        field: 'ip_address'
    },
    processedMessages: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'processed_messages'
    },
    catalogItemMessageCounts: {
        type: Sequelize.TEXT,
        field: 'catalog_item_message_counts'
    },
    messageSpeed: {
        type: Sequelize.BIGINT,
        field: 'message_speed'
    },
    lastCommandTime: {
        type: Sequelize.BIGINT,
        field: 'last_command_time'
    },
    networkInterface: {
        type: Sequelize.TEXT,
        defaultValue: "eth0",
        field: 'network_interface'
    },
    dockerUrl: {
        type: Sequelize.TEXT,
        defaultValue: "unix:///var/run/docker.sock",
        field: 'docker_url'
    },
    diskLimit: {
        type: Sequelize.FLOAT,
        defaultValue: 50,
        field: 'disk_limit'
    },
    diskDirectory: {
        type: Sequelize.TEXT,
        defaultValue: '/var/lib/iofog/',
        field: 'disk_directory'
    },
    memoryLimit: {
        type: Sequelize.FLOAT,
        defaultValue: 4096,
        field: 'memory_limit'
    },
    cpuLimit: {
        type: Sequelize.FLOAT,
        defaultValue: 80,
        field: 'cpu_limit'
    },
    logLimit: {
        type: Sequelize.FLOAT,
        defaultValue: 10,
        field: 'log_limit'
    },
    logDirectory: {
        type: Sequelize.TEXT,
        defaultValue: "/var/log/iofog/",
        field: 'log_directory'
    },
    bluetooth: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'bluetooth'
    },
    hal: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'hal'
    },
    logFileCount: {
        type: Sequelize.BIGINT,
        defaultValue: 10,
        field: 'log_file_count'
    },
    version: {
        type: Sequelize.TEXT,
        field: 'version'
    },
    isReadyToUpgrade: {
        type: Sequelize.BOOLEAN,
        defaultValue: 1,
        field: "is_ready_to_upgrade"
    },
    isReadyToRollback: {
        type: Sequelize.BOOLEAN,
        defaultValue: 0,
        field: "is_ready_to_rollback"
    },
    statusFrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        field: 'status_frequency'
    },
    changeFrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        field: 'change_frequency'
    },
    scanFrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        field: 'scan_frequency'
    },
    proxy: {
        type: Sequelize.TEXT,
        defaultValue: "",
        field: 'proxy'
    },
    isolatedDockerContainer: {
        type: Sequelize.BOOLEAN,
        defaultValue: 1,
        field: 'isolated_docker_container'
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

Fog.belongsTo(FogType, {
    foreignKey: 'fog_type_id',
    as: 'fogTypeId',
    defaultValue: 0
});

Fog.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'userId',
    defaultValue: 0,
    onDelete: 'cascade'
});

module.exports = Fog;