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
const Validator = require('../schemas/index');
const MicroserviceService = require('../services/microservices-service');
const StraceDiagnosticManager = require('../sequelize/managers/strace-diagnostics-manager');
const ChangeTrackingService = require('./change-tracking-service');
const MicroserviceManager = require('../sequelize/managers/microservice-manager');
const config = require('../config');
const fs = require('fs');
const logger = require('../logger');
const ftpClient = require('ftp');
const path = require('path');
const mime = require('mime');


const changeMicroserviceStraceState = async function (id, data, user, isCLI, transaction) {
  await Validator.validate(data, Validator.schemas.straceStateUpdate);
  const microservice = await MicroserviceService.getMicroservice(id, user, isCLI, transaction);
  if (microservice.iofogUuid === null) {
    throw new Errors.ValidationError(ErrorMessages.STRACE_WITHOUT_FOG);
  }

  const straceObj = {
    straceRun: data.enable,
    microserviceUuid: id
  };

  await StraceDiagnosticManager.updateOrCreate({microserviceUuid: id}, straceObj, transaction);
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.diagnostics, transaction)
};

const getMicroserviceStraceData = async function (id, data, user, isCLI, transaction) {
  await Validator.validate(data, Validator.schemas.straceGetData);
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
  await Validator.validate(data, Validator.schemas.stracePostToFtp);
  const straceData = await StraceDiagnosticManager.findOne({microserviceUuid: id}, transaction);
  const dir = config.get('Diagnostics:DiagnosticDir');
  const filePath = dir + '/' + id;

  _createDirectoryIfNotExists(dir);
  _writeBufferToFile(filePath, straceData.buffer);
  await _sendFileToFtp(data, filePath);
  _deleteFile(filePath);
};

const postMicroserviceImageSnapshotCreate = async function (microserviceUuid, user, isCLI, transaction) {
  const where = isCLI ?
    {
      uuid: microserviceUuid
    }
    :
    {
      uuid: microserviceUuid,
      userId: user.id
    };


  const microservice = await MicroserviceManager.findOneWithDependencies(where, {}, transaction);

  if (microservice.iofogUuid === null) {
    throw new Errors.ValidationError(ErrorMessages.IMAGE_SNAPSHOT_WITHOUT_FOG);
  }

  const microserviceToUpdate = {
    imageSnapshot: 'get_image'
  };

  await MicroserviceManager.update({uuid: microservice.uuid}, microserviceToUpdate, transaction);
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.imageSnapshot, transaction);
};

const getMicroserviceImageSnapshot = async function (microserviceUuid, user, isCLI, transaction) {
  const where = isCLI ?
    {
      uuid: microserviceUuid
    }
    :
    {
      uuid: microserviceUuid,
      userId: user.id
    };
  const microservice = await MicroserviceManager.findOneWithDependencies(where, {}, transaction);
  if (microservice.iofogUuid === null) {
    throw new Errors.ValidationError(ErrorMessages.IMAGE_SNAPSHOT_WITHOUT_FOG);
  }

  const microserviceToUpdate = {
    imageSnapshot: ''
  };

  if (!microservice.imageSnapshot || microservice.imageSnapshot === 'get_image') {
    throw new Errors.ValidationError(ErrorMessages.IMAGE_SNAPSHOT_NOT_AVAILABLE)
  }
  let _path = microservice.imageSnapshot;
  await MicroserviceManager.update({uuid: microservice.uuid}, microserviceToUpdate, transaction);
  if (isCLI) {
    return _path
  } else {
    let mimetype = mime.lookup(microservice.imageSnapshot);
    let stat = fs.statSync(_path);
    let fileSize = stat.size;
    return {
      'Content-Length': fileSize,
      'Content-Type': mimetype,
      fileName: _path.split(new RegExp('/'))[1],
      filePath: _path
    };
  }

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
  postMicroserviceStraceDatatoFtp: TransactionDecorator.generateTransaction(postMicroserviceStraceDatatoFtp),
  postMicroserviceImageSnapshotCreate: TransactionDecorator.generateTransaction(postMicroserviceImageSnapshotCreate),
  getMicroserviceImageSnapshot: TransactionDecorator.generateTransaction(getMicroserviceImageSnapshot)

};