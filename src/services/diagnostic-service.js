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

const TransactionDecorator = require('../decorators/transaction-decorator');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const validator = require('../schemas/index');
const MicroserviceService = require('../services/microservices-service');
const StraceDiagnosticManager = require('../sequelize/managers/strace-diagnostics-manager');
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager');
const config = require('../config');
const fs = require('fs');
const logger = require('../logger');
const ftpClient = require('ftp');

const changeMicroserviceStraceState = async function (id, data, user, isCLI, transaction) {
  validator.validate(data, validator.schemas.straceStateUpdate);
  const microservice = await MicroserviceService.getMicroservice(id, user, isCLI, transaction);
  if (microservice.iofogUuid === null) {
    throw new Errors.ValidationError(ErrorMessages.STRACE_WITHOUT_FOG);
  }

  const straceObj = {
    straceRun: data.enable,
    microserviceUuid: id
  };

  await StraceDiagnosticManager.updateOrCreate({microserviceUuid: id}, straceObj, transaction);
  await ChangeTrackingManager.update({iofogUuid: microservice.iofogUuid}, {diagnostics: true}, transaction)
};

const getMicroserviceStraceData = async function (id, data, user, isCLI, transaction) {
  validator.validate(data, validator.schemas.straceGetData);
  const straceData = await StraceDiagnosticManager.findOne({microserviceUuid: id}, transaction);
  const dir = config.get('Diagnostics:DiagnosticDir') || 'diagnostics';
  const filePath = dir + '/' + id;

  let result = straceData.buffer;

  if (data.format === 'file') {
    _createDirectoryIfNotExists(dir);
    _writeBufferToFile(filePath, straceData.buffer);
    result = _converFileToBase64(filePath);
    _deleteFile(filePath);
  }

  return {
    data: result
  };
};

const postMicroserviceStraceDatatoFtp = async function (id, data, user, isCLI, transaction) {
  validator.validate(data, validator.schemas.stracePostToFtp);
  const straceData = await StraceDiagnosticManager.findOne({microserviceUuid: id}, transaction);
  const dir = config.get('Diagnostics:DiagnosticDir');
  const filePath = dir + '/' + id;

  _createDirectoryIfNotExists(dir);
  _writeBufferToFile(filePath, straceData.buffer);
  await _sendFileToFtp(data, filePath);
  _deleteFile(filePath);
};

const _sendFileToFtp = async function (data, filePath) {

  const destDir = data.ftpDestDir;
  const connectionData = {
    host: data.ftpHost,
    port: data.ftpPort,
    user: data.ftpUser,
    password: data.ftpPass,
    protocol: 'ftp'
  };

  await writeFileToFtp(connectionData, filePath, destDir);
};

const writeFileToFtp = function (connectionData, filePath, destDir) {
  return new Promise((resolve, reject) => {
    const client = new ftpClient();

    client.on('ready', () => {
      client.put(filePath, destDir + '/' + filePath.split('/').pop(), err => {
        if (err) {
          client.end();
          logger.warn(AppHelper.formatMessage(ErrorMessages.FTP_ERROR, err));
          reject(new Errors.FtpError(AppHelper.formatMessage(ErrorMessages.FTP_ERROR, err)));
        } else {
          client.end();
          resolve();
        }
      });
    });

    client.on('error', err => {
      logger.warn(AppHelper.formatMessage(ErrorMessages.FTP_ERROR, err));
      reject(new Errors.FtpError(AppHelper.formatMessage(ErrorMessages.FTP_ERROR, err)));
    });

    client.connect(connectionData);
  })
};


const _createDirectoryIfNotExists = function (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const _writeBufferToFile = function (filePath, data) {

  fs.writeFileSync(filePath, data, (err) => {
    if (err) {
      throw new Error(AppHelper.formatMessage(ErrorMessages.UNABLE_TO_WRITE_STRACE, data, err));
    }
  });
};

const _converFileToBase64 = function (filePath) {
  const bitmap = fs.readFileSync(filePath);
  return new Buffer(bitmap).toString('base64');
};

const _deleteFile = function (filePath) {
  fs.unlinkSync(filePath, (err) => {
    if (err) {
      logger.warn(AppHelper.formatMessage(ErrorMessages.UNABLE_TO_DELETE_STRACE, filePath, err));
    }
  });
};

module.exports = {
  changeMicroserviceStraceState: TransactionDecorator.generateTransaction(changeMicroserviceStraceState),
  getMicroserviceStraceData: TransactionDecorator.generateTransaction(getMicroserviceStraceData),
  postMicroserviceStraceDatatoFtp: TransactionDecorator.generateTransaction(postMicroserviceStraceDatatoFtp)
};