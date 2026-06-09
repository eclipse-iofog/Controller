/*
 * *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const TransactionDecorator = require('../decorators/transaction-decorator')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas/index')
const MicroserviceService = require('../services/microservices-service')
const StraceDiagnosticManager = require('../data/managers/strace-diagnostics-manager')
const ChangeTrackingService = require('./change-tracking-service')
const MicroserviceManager = require('../data/managers/microservice-manager')
const Config = require('../config')
const fs = require('fs')
const logger = require('../logger')
const FtpClient = require('ftp')
const mime = require('mime')

const changeMicroserviceStraceState = async function (uuid, data, isCLI, transaction) {
  await Validator.validate(data, Validator.schemas.straceStateUpdate)
  const microservice = await MicroserviceService.getMicroserviceEndPoint(uuid, isCLI, transaction)
  if (microservice.iofogUuid === null) {
    throw new Errors.ValidationError(ErrorMessages.STRACE_WITHOUT_FOG)
  }

  const straceObj = {
    straceRun: data.enable,
    microserviceUuid: uuid
  }

  await StraceDiagnosticManager.updateOrCreate({ microserviceUuid: uuid }, straceObj, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.diagnostics, transaction)
}

const getMicroserviceStraceData = async function (uuid, data, isCLI, transaction) {
  await Validator.validate(data, Validator.schemas.straceGetData)

  const microserviceWhere = isCLI
    ? { uuid: uuid }
    : { uuid: uuid }
  const microservice = await MicroserviceManager.findOne(microserviceWhere, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, uuid))
  }

  const straceData = await StraceDiagnosticManager.findOne({ microserviceUuid: uuid }, transaction)
  if (!straceData) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_STRACE, uuid))
  }

  const dir = Config.get('diagnostics.directory') || 'diagnostics'
  const filePath = dir + '/' + uuid

  let result = straceData.buffer

  if (data.format === 'file') {
    _createDirectoryIfNotExists(dir)
    _writeBufferToFile(filePath, straceData.buffer)
    result = _convertFileToBase64(filePath)
    _deleteFile(filePath)
  }

  return {
    data: result
  }
}

const postMicroserviceStraceDatatoFtp = async function (uuid, data, isCLI, transaction) {
  await Validator.validate(data, Validator.schemas.stracePostToFtp)

  const microserviceWhere = isCLI
    ? { uuid: uuid }
    : { uuid: uuid }
  const microservice = await MicroserviceManager.findOne(microserviceWhere, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, uuid))
  }
  const straceData = await StraceDiagnosticManager.findOne({ microserviceUuid: uuid }, transaction)

  if (!straceData) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_STRACE, uuid))
  }

  const dir = Config.get('diagnostics.directory')
  const filePath = dir + '/' + uuid

  _createDirectoryIfNotExists(dir)
  _writeBufferToFile(filePath, straceData.buffer)
  await _sendFileToFtp(data, filePath)
  _deleteFile(filePath)
}

const postMicroserviceImageSnapshotCreate = async function (microserviceUuid, isCLI, transaction) {
  const where = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }

  const microservice = await MicroserviceManager.findOneWithDependencies(where, {}, transaction)

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (microservice.iofogUuid === null) {
    throw new Errors.ValidationError(ErrorMessages.IMAGE_SNAPSHOT_WITHOUT_FOG)
  }

  const microserviceToUpdate = {
    imageSnapshot: 'get_image'
  }

  await MicroserviceManager.update({ uuid: microservice.uuid }, microserviceToUpdate, transaction)
  await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.imageSnapshot, transaction)
}

const getMicroserviceImageSnapshot = async function (microserviceUuid, isCLI, transaction) {
  const where = isCLI
    ? {
      uuid: microserviceUuid
    }
    : {
      uuid: microserviceUuid
    }
  const microservice = await MicroserviceManager.findOneWithDependencies(where, {}, transaction)
  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid))
  }
  if (microservice.iofogUuid === null) {
    throw new Errors.ValidationError(ErrorMessages.IMAGE_SNAPSHOT_WITHOUT_FOG)
  }

  const microserviceToUpdate = {
    imageSnapshot: ''
  }

  if (!microservice.imageSnapshot || microservice.imageSnapshot === 'get_image') {
    throw new Errors.ValidationError(ErrorMessages.IMAGE_SNAPSHOT_NOT_AVAILABLE)
  }
  const _path = microservice.imageSnapshot
  await MicroserviceManager.update({ uuid: microservice.uuid }, microserviceToUpdate, transaction)
  if (isCLI) {
    return _path
  } else {
    const mimetype = mime.lookup(microservice.imageSnapshot)
    const stat = fs.statSync(_path)
    const fileSize = stat.size
    return {
      'Content-Length': fileSize,
      'Content-Type': mimetype,
      'fileName': _path.split(new RegExp('/'))[1],
      'filePath': _path
    }
  }
}

const _sendFileToFtp = async function (data, filePath) {
  const destDir = data.ftpDestDir
  const connectionData = {
    host: data.ftpHost,
    port: data.ftpPort,
    user: data.ftpUser,
    password: data.ftpPass,
    protocol: 'ftp'
  }

  await writeFileToFtp(connectionData, filePath, destDir)
}

const writeFileToFtp = function (connectionData, filePath, destDir) {
  return new Promise((resolve, reject) => {
    const client = new FtpClient()

    client.on('ready', () => {
      client.put(filePath, destDir + '/' + filePath.split('/').pop(), (err) => {
        if (err) {
          client.end()
          logger.warn(AppHelper.formatMessage(ErrorMessages.FTP_ERROR, err))
          reject(new Errors.FtpError(AppHelper.formatMessage(ErrorMessages.FTP_ERROR, err)))
        } else {
          client.end()
          resolve()
        }
      })
    })

    client.on('error', (err) => {
      logger.warn(AppHelper.formatMessage(ErrorMessages.FTP_ERROR, err))
      reject(new Errors.FtpError(AppHelper.formatMessage(ErrorMessages.FTP_ERROR, err)))
    })

    client.connect(connectionData)
  })
}

const _createDirectoryIfNotExists = function (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
}

const _writeBufferToFile = function (filePath, data) {
  fs.writeFileSync(filePath, data, (err) => {
    if (err) {
      throw new Error(AppHelper.formatMessage(ErrorMessages.UNABLE_TO_WRITE_STRACE, data, err))
    }
  })
}

const _convertFileToBase64 = function (filePath) {
  const file = fs.readFileSync(filePath)
  /* eslint-disable new-cap */
  return new Buffer.from(file).toString('base64')
}

const _deleteFile = function (filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      logger.warn(AppHelper.formatMessage(ErrorMessages.UNABLE_TO_DELETE_STRACE, filePath, err))
    }
  })
}

module.exports = {
  changeMicroserviceStraceState: TransactionDecorator.generateTransaction(changeMicroserviceStraceState),
  getMicroserviceStraceData: TransactionDecorator.generateTransaction(getMicroserviceStraceData),
  postMicroserviceStraceDatatoFtp: TransactionDecorator.generateTransaction(postMicroserviceStraceDatatoFtp),
  postMicroserviceImageSnapshotCreate: TransactionDecorator.generateTransaction(postMicroserviceImageSnapshotCreate),
  getMicroserviceImageSnapshot: TransactionDecorator.generateTransaction(getMicroserviceImageSnapshot)

}
