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
const sequelize = require('./../utils/sequelize');
const Registry = require('./../models/registry');
const FogProvisionKey = require('./fogProvisionKey');
const ChangeTracking = require('./changeTracking');
const FogType = require('./fogType');

const Fog = sequelize.define('iofogs', {
    uuid: {
        type: Sequelize.TEXT,
        primaryKey: true,
        field: 'UUID'
    },
    name: {
        type: Sequelize.TEXT,
        defaultValue: "Unnamed ioFog 1",
        field: 'Name'
    },
    location: {
        type: Sequelize.TEXT,
        field: 'Location'
    },
    gpsmode: {
        type: Sequelize.TEXT,
        field: 'GpsMode'
    },
    latitude: {
        type: Sequelize.TEXT,
        field: 'Latitude'
    },
    longitude: {
        type: Sequelize.TEXT,
        field: 'Longitude'
    },
    description: {
        type: Sequelize.TEXT,
        field: 'Description'
    },
    lastactive: {
        type: Sequelize.BIGINT,
        field: 'LastActive'
    },
    token: {
        type: Sequelize.TEXT,
        field: 'Token'
    },
    daemonstatus: {
        type: Sequelize.TEXT,
        defaultValue: "UNKNOWN",
        field: 'DaemonStatus'
    },
    daemonoperatingduration: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'DaemonOperatingDuration'
    },
    daemonlaststart: {
        type: Sequelize.BIGINT,
        field: 'DaemonLastStart'
    },
    memoryusage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.000,
        field: 'MemoryUsage'
    },
    diskusage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.000,
        field: 'DiskUsage'
    },
    cpuusage: {
        type: Sequelize.FLOAT,
        defaultValue: 0.00,
        field: 'CPUUsage'
    },
    memoryviolation: {
        type: Sequelize.TEXT,
        field: 'MemoryViolation'
    },
    diskviolation: {
        type: Sequelize.TEXT,
        field: 'DiskViolation'
    },
    cpuviolation: {
        type: Sequelize.TEXT,
        field: 'CPUViolation'
    },
    elementstatus: {
        type: Sequelize.TEXT,
        field: 'ElementStatus'
    },
    repositorycount: {
        type: Sequelize.BIGINT,
        field: 'RepositoryCount'
    },
    repositorystatus: {
        type: Sequelize.TEXT,
        field: 'RepositoryStatus'
    },
    systemtime: {
        type: Sequelize.BIGINT,
        field: 'SystemTime'
    },
    laststatustime: {
        type: Sequelize.BIGINT,
        field: 'LastStatusTime'
    },
    ipaddress: {
        type: Sequelize.TEXT,
        defaultValue: "0.0.0.0",
        field: 'IPAddress'
    },
    processedmessages: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'ProcessedMessages'
    },
    elementmessagecounts: {
        type: Sequelize.TEXT,
        field: 'ElementMessageCounts'
    },
    messagespeed: {
        type: Sequelize.BIGINT,
        field: 'MessageSpeed'
    },
    lastcommandtime: {
        type: Sequelize.BIGINT,
        field: 'LastCommandTime'
    },
    networkinterface: {
        type: Sequelize.TEXT,
        defaultValue: "eth0",
        field: 'NetworkInterface'
    },
    dockerurl: {
        type: Sequelize.TEXT,
        defaultValue: "unix:///var/run/docker.sock",
        field: 'DockerURL'
    },
    disklimit: {
        type: Sequelize.FLOAT,
        defaultValue: 50,
        field: 'DiskLimit'
    },
    diskdirectory: {
        type: Sequelize.TEXT,
        defaultValue: '/var/lib/iofog/',
        field: 'DiskDirectory'
    },
    memorylimit: {
        type: Sequelize.FLOAT,
        defaultValue: 4096,
        field: 'MemoryLimit'
    },
    cpulimit: {
        type: Sequelize.FLOAT,
        defaultValue: 80,
        field: 'CPULimit'
    },
    loglimit: {
        type: Sequelize.FLOAT,
        defaultValue: 10,
        field: 'LogLimit'
    },
    logdirectory: {
        type: Sequelize.TEXT,
        defaultValue: "/var/log/iofog/",
        field: 'LogDirectory'
    },
    debug: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'Debug'
    },
    viewer: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'Viewer'
    },
    bluetooth: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'Bluetooth'
    },
    hal: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'hal'
    },
    mongo: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'mongo'
    },
    influx: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'influx'
    },
    grafana: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'grafana'
    },
    logfilecount: {
        type: Sequelize.BIGINT,
        defaultValue: 10,
        field: 'LogFileCount'
    },
    version: {
        type: Sequelize.TEXT,
        field: 'Version'
    },
    isReadyToUpgrade: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        field: "isReadyToUpgrade"
    },
    isReadyToRollback: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: "isReadyToRollback"
    },
    statusfrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        field: 'StatusFrequency'
    },
    changefrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        field: 'ChangeFrequency'
    },
    scanfrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        field: 'ScanFrequency'
    },
    proxy: {
        type: Sequelize.TEXT,
        defaultValue: "",
        field: 'Proxy'
    },
    isolateddockercontainer: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        field: 'IsolatedDockerContainer'
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

Registry.belongsTo(Fog, {
    foreignKey: 'iofog_uuid'
});

FogProvisionKey.belongsTo(Fog, {
    foreignKey: 'iofog_uuid'
});

Fog.belongsTo(FogType, {
    foreignKey: 'typeKey',
    defaultValue: 0
});

module.exports =  Fog;