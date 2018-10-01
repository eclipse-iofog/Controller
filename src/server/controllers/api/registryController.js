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

const async = require('async');
const express = require('express');

const router = express.Router();

const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');
const RegistryService = require('../../services/registryService');
const UserService = require('../../services/userService');


/********************************************* EndPoints ******************************************************/

/*********** GET listRegistryEndPoint (Get: /api/v2/authoring/registry/list) **********/
const listRegistryEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        registryForUserProps = {
            userId: 'user.id',
            setProperty: 'registry'
        };
    params.bodyParams = req.params;
    params.bodyParams.t = req.query.t;

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            async.apply(RegistryService.listRegistry, registryForUserProps)
        ],
        function (err, result) {
            AppUtils.sendResponse(res, err, 'registry', params.registry, result);
        });
};
/*********** POST addRegistryEndPoint (Post: /api/v2/authoring/registry/add) **********/
const addRegistryEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        registryProps = {
            url: 'bodyParams.url',
            isPublic: 'bodyParams.isPublic',
            username: 'bodyParams.username',
            password: 'bodyParams.password',
            email: 'bodyParams.email',
            userId: 'user.id'
        };

    params.bodyParams = req.body;
    params.bodyParams.t = req.query.t;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            async.apply(RegistryService.addRegistry, registryProps)
        ],
        function (err, result) {
            AppUtils.sendResponse(res, err, 'registry', params.registry, result);
        });
};

/*********** POST deleteRegistryEndPoint (Post: /api/v2/authoring/registry/delete) **********/
const deleteRegistryEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        registryProps = {
            id: 'bodyParams.id'
        };

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            async.apply(RegistryService.deleteRegistry, registryProps)
        ],
        function (err, result) {
            AppUtils.sendResponse(res, err, 'registry', params.registry, result);
        });
};


module.exports =  {
    listRegistryEndPoint: listRegistryEndPoint,
    addRegistryEndPoint: addRegistryEndPoint,
    deleteRegistryEndPoint: deleteRegistryEndPoint
};