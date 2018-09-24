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

const AppUtils = require('./appUtils');
let fs = require('fs');
const logger = require('./winstonLogs');

const createFile = function (props, params, callback) {

    let fileName = AppUtils.getProperty(params, props.fileName);
    let filePath = props.distDir + '/' + fileName;

    let data = AppUtils.getProperty(params, props.data);

    fs.writeFile(filePath, data, (err) => {
        if (err) {
            callback('error', 'Can\'t write strace data to file')
        } else {
            params[props.setProperty] = filePath;
            callback(null, params)
        }
    });
};

const createDirIfNotExists = function (props, params, callback) {
    let dir = props.distDir;

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    callback(null, params);
};

const fileToBase64 = function (props, params, callback) {
    let file = AppUtils.getProperty(params, props.file);
    let bitmap = fs.readFileSync(file);
    params[props.setProperty] = new Buffer(bitmap).toString('base64');
    callback(null, params);
};

const deleteFile = function (props, params, callback) {
    let file = AppUtils.getProperty(params, props.file);

    fs.unlink(file, (err) => {
        if (err) {
            logger.warn('Error while deleting strace data file. File name: ' + file + ' err: ' + err);
        }
        callback(null, params);
    });
};

module.exports =  {
    createFile: createFile,
    createDirIfNotExists: createDirIfNotExists,
    fileToBase64: fileToBase64,
    deleteFile: deleteFile
}