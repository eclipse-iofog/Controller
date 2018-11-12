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

const FogProvisionKeyManager = require('../sequelize/managers/iofog-provision-key-manager');
const FogTypeManager = require('../sequelize/managers/iofog-type-manager');
const FogManager = require('../sequelize/managers/iofog-manager');
const FogAccessTokenService = require('../services/iofog-access-token-service');
const ChangeTrackingService = require('./change-tracking-service');
const FogVersionCommandManager = require('../sequelize/managers/iofog-version-command-manager');
const StraceManager = require('../sequelize/managers/strace-manager');
const RegistryManager = require('../sequelize/managers/registry-manager');
const MicroserviceStatusManager = require('../sequelize/managers/microservice-status-manager')
const Validator = require('../schemas');
const Errors = require('../helpers/errors');
const AppHelper = require('../helpers/app-helper');
const ErrorMessages = require('../helpers/error-messages');
const HWInfoManager = require('../sequelize/managers/hw-info-manager');
const USBInfoManager = require('../sequelize/managers/usb-info-manager');
const TunnelManager = require('../sequelize/managers/tunnel-manager');
const MicroserviceManager = require('../sequelize/managers/microservice-manager');
const MicroserviceService = require('../services/microservices-service');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const logger = require('../logger');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const agentProvision = async function (provisionData, transaction) {

  await Validator.validate(provisionData, Validator.schemas.agentProvision);

  const provision = await FogProvisionKeyManager.findOne({
    provisionKey: provisionData.key
  }, transaction);
  if (!provision) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_PROVISIONING_KEY)
  }

  let currentTime = new Date();
  if (provision.expirationTime < currentTime) {
    throw new Errors.AuthenticationError(ErrorMessages.EXPIRED_PROVISION_KEY)
  }

  const fog = await FogManager.findOne({
    uuid: provision.iofogUuid
  }, transaction);

  await _checkMicroservicesFogType(fog, provisionData.type, transaction);

  const newAccessToken = await FogAccessTokenService.generateAccessToken(transaction);

  await FogAccessTokenService.updateAccessToken(fog.uuid, newAccessToken, transaction);

  await FogManager.update({
    uuid: fog.uuid
  }, {
    fogTypeId: provisionData.type
  }, transaction);

  await FogProvisionKeyManager.delete({
    provisionKey: provisionData.key
  }, transaction);

  return {
    uuid: fog.uuid,
    token: newAccessToken.token
  };

};

const getAgentConfig = async function (fog) {
  return {
    networkInterface: fog.networkInterface,
    dockerUrl: fog.dockerUrl,
    diskLimit: fog.diskLimit,
    diskDirectory: fog.diskDirectory,
    memoryLimit: fog.memoryLimit,
    cpuLimit: fog.cpuLimit,
    logLimit: fog.logLimit,
    logDirectory: fog.logDirectory,
    logFileCount: fog.logFileCount,
    statusFrequency: fog.statusFrequency,
    changeFrequency: fog.changeFrequency,
    deviceScanFrequency: fog.deviceScanFrequency,
    watchdogEnabled: fog.watchdogEnabled,
    latitude: fog.latitude,
    longitude: fog.longitude
  };
};

const updateAgentConfig = async function (updateData, fog, transaction) {
  await Validator.validate(updateData, Validator.schemas.updateAgentConfig);

  let update = {
    networkInterface: updateData.networkInterface,
    dockerUrl: updateData.dockerUrl,
    diskLimit: updateData.diskLimit,
    diskDirectory: updateData.diskDirectory,
    memoryLimit: updateData.memoryLimit,
    cpuLimit: updateData.cpuLimit,
    logLimit: updateData.logLimit,
    logDirectory: updateData.logDirectory,
    logFileCount: updateData.logFileCount,
    statusFrequency: updateData.statusFrequency,
    changeFrequency: updateData.changeFrequency,
    deviceScanFrequency: updateData.deviceScanFrequency,
    watchdogEnabled: updateData.watchdogEnabled,
    latitude: updateData.latitude,
    longitude: updateData.longitude,
    gpsMode: updateData.gpsMode
  };
  update = AppHelper.deleteUndefinedFields(update);

  await FogManager.update({
    uuid: fog.uuid
  }, update, transaction);
};

const getAgentConfigChanges = async function (fog, transaction) {

  const changeTracking = await ChangeTrackingService.getByFogId(fog.uuid, transaction);
  if (!changeTracking) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_NODE_ID)
  }

  await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.clean, transaction);

  return {
    config: changeTracking.config,
    version: changeTracking.version,
    reboot: changeTracking.reboot,
    deleteNode: changeTracking.deleteNode,
    microserviceList: changeTracking.microserviceList,
    microserviceConfig: changeTracking.microserviceConfig,
    routing: changeTracking.routing,
    registries: changeTracking.registries,
    tunnel: changeTracking.tunnel,
    diagnostics: changeTracking.diagnostics,
    isImageSnapshot: changeTracking.isImageSnapshot
  };
};

const updateAgentStatus = async function (agentStatus, fog, transaction) {
  await Validator.validate(agentStatus, Validator.schemas.updateAgentStatus);

  let fogStatus = {
    daemonStatus: agentStatus.daemonStatus,
    daemonOperatingDuration: agentStatus.daemonOperatingDuration,
    daemonLastStart: agentStatus.daemonLastStart,
    memoryUsage: agentStatus.memoryUsage,
    diskUsage: agentStatus.diskUsage,
    cpuUsage: agentStatus.cpuUsage,
    memoryViolation: agentStatus.memoryViolation,
    diskViolation: agentStatus.diskViolation,
    cpuViolation: agentStatus.cpuViolation,
    repositoryCount: agentStatus.repositoryCount,
    repositoryStatus: agentStatus.repositoryStatus,
    systemTime: agentStatus.systemTime,
    lastStatusTime: agentStatus.lastStatusTime,
    ipAddress: agentStatus.ipAddress,
    processedMessages: agentStatus.processedMessages,
    microserviceMessageCounts: agentStatus.microserviceMessageCounts,
    messageSpeed: agentStatus.messageSpeed,
    lastCommandTime: agentStatus.lastCommandTime,
    tunnelStatus: agentStatus.tunnelStatus,
    version: agentStatus.version,
    isReadyToUpgrade: agentStatus.isReadyToUpgrade,
    isReadyToRollback: agentStatus.isReadyToRollback
  };

  fogStatus = AppHelper.deleteUndefinedFields(fogStatus);

  await FogManager.update({
    uuid: fog.uuid
  }, fogStatus, transaction);

  await _updateMicroserviceStatuses(JSON.parse(agentStatus.microserviceStatus), transaction);
  await MicroserviceService.deleteNotRunningMicroservices(transaction);
};


const _updateMicroserviceStatuses = async function (microserviceStatus, transaction) {
  for (status of microserviceStatus) {
    let microserviceStatus = {
      containerId: status.containerId,
      status: status.status,
      startTime: status.startTime,
      operatingDuration: status.operatingDuration,
      cpuUsage: status.cpuUsage,
      memoryUsage: status.memoryUsage
    };
    microserviceStatus = AppHelper.deleteUndefinedFields(microserviceStatus);

    await MicroserviceStatusManager.update({
      microserviceUuid: status.id
    }, microserviceStatus, transaction);
  }
};

const getAgentMicroservices = async function (fog, transaction) {
  const microservices = await MicroserviceManager.findAllActiveFlowMicroservices(fog.uuid, transaction);

  const fogTypeId = fog.fogTypeId;

  const response = [];
  for (let microservice of microservices) {
    const images = microservice.catalogItem.images;
    const image = images.find(image => image.fogTypeId === fogTypeId);
    const imageId = image ? image.containerImage : '';

    const routes = await MicroserviceService.getPhysicalConections(microservice, transaction);

    const responseMicroservice = {
      uuid: microservice.uuid,
      imageId: imageId,
      config: microservice.config,
      rebuild: microservice.rebuild,
      rootHostAccess: microservice.rootHostAccess,
      logSize: microservice.logSize,
      registryUrl: microservice.catalogItem.registry.url,
      portMappings: microservice.ports,
      volumeMappings: microservice.volumeMappings,
      imageSnapshot: microservice.imageSnapshot,
      delete: microservice.delete,
      deleteWithCleanup: microservice.deleteWithCleanup,
      routes: routes
    };

    response.push(responseMicroservice);

    await MicroserviceManager.update({
      uuid: microservice.uuid
    }, {
      rebuild: false
    }, transaction);

  }

  return {
    microservices: response
  }
};

const getAgentMicroservice = async function (microserviceUuid, fog, transaction) {
  const microservice = await MicroserviceManager.findOneWithDependencies({
    uuid: microserviceUuid,
    iofogUuid: fog.uuid
  }, {}, transaction);

  if (!microservice) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, microserviceUuid));
  }
  return {
    microservice: microservice
  }
};

const getAgentRegistries = async function (fog, transaction) {
  const registries = await RegistryManager.findAll({
    [Op.or]:
      [
        {
          userId: fog.userId
        },
        {
          isPublic: true
        }
      ]
  }, transaction);
  return {
    registries: registries
  }
};

const getAgentTunnel = async function (fog, transaction) {
  const tunnel = await TunnelManager.findOne({
    iofogUuid: fog.uuid
  }, transaction);

  if (!tunnel) {
    throw new Errors.NotFoundError(ErrorMessages.TUNNEL_NOT_FOUND);
  }

  return {
    tunnel: tunnel
  }
};

const getAgentStrace = async function (fog, transaction) {
  const fogWithStrace = FogManager.findFogStraces({
    uuid: fog.uuid
  }, transaction);

  if (!fogWithStrace) {
    throw new Errors.NotFoundError(ErrorMessages.STRACE_NOT_FOUND);
  }

  return fogWithStrace.strace;
};

const updateAgentStrace = async function (straceData, fog, transaction) {
  await Validator.validate(straceData, Validator.schemas.updateAgentStrace);

  for (const strace of straceData.straceData) {
    const microserviceId = strace.microserviceId;
    const buffer = strace.buffer;
    await StraceManager.pushBufferByMicroserviceId(microserviceId, buffer, transaction)
  }

};

const getAgentChangeVersionCommand = async function (fog, transaction) {
  const versionCommand = await FogVersionCommandManager.findOne({
    iofogUuid: fog.uuid
  }, transaction);
  if (!versionCommand) {
    throw new Errors.NotFoundError(ErrorMessages.VERSION_COMMAND_NOT_FOUND);
  }

  const provision = FogProvisionKeyManager.findOne({
    iofogUuid: fog.uuid
  }, transaction);

  return {
    versionCommand: versionCommand.versionCommand,
    provisionKey: provision.key,
    expirationTime: provision.expirationTime
  }
};

const updateHalHardwareInfo = async function (hardwareData, fog, transaction) {
  await Validator.validate(hardwareData, Validator.schemas.updateHardwareInfo);

  hardwareData.iofogUuid = fog.uuid;

  await HWInfoManager.updateOrCreate({
    iofogUuid: fog.uuid
  }, hardwareData, transaction);
};

const updateHalUsbInfo = async function (usbData, fog, transaction) {
  await Validator.validate(usbData, Validator.schemas.updateUsbInfo);

  usbData.iofogUuid = fog.uuid;

  await USBInfoManager.updateOrCreate({
    iofogUuid: fog.uuid
  }, usbData, transaction);
};

const deleteNode = async function (fog, transaction) {
  await FogManager.delete({
    uuid: fog.uuid
  }, transaction);
};

const getImageSnapshot = async function (fog, transaction) {
  const microservice = await MicroserviceManager.findOne({
    iofogUuid: fog.uuid,
    imageSnapshot: 'get_image'
  }, transaction);
  if (!microservice) {
    throw new Errors.NotFoundError(ErrorMessages.IMAGE_SNAPSHOT_NOT_FOUND);
  }

  return {
    uuid: microservice.uuid
  }
};

const putImageSnapshot = async function (req, fog, transaction) {
  if (req.headers['content-type'].includes('multipart/form-data')) {
    throw new Errors.ValidationError(ErrorMessages.INVALID_CONTENT_TYPE);
  }

  const form = new formidable.IncomingForm();
  form.uploadDir = path.join(appRoot, '../') + 'data';
  if (!fs.existsSync(form.uploadDir)) {
    fs.mkdirSync(form.uploadDir);
  }
  const absolutePath = await saveSnapShot(req, form);
  await MicroserviceManager.update({
    iofogUuid: fog.uuid,
    imageSnapshot: 'get_image'
  }, {
    imageSnapshot: absolutePath
  }, transaction);

};

const saveSnapShot = function (req, form) {
  return new Promise((resolve, reject) => {

    form.parse(req, async function (error, fields, files) {
      const file = files['upstream'];

      if (file === undefined) {
        reject(new Errors.ValidationError(ErrorMessages.UPLOADED_FILE_NOT_FOUND));
        return;
      }

      const filePath = file['path'];


      let absolutePath = path.resolve(filePath);
      fs.rename(absolutePath, absolutePath + '.tar.gz');
      resolve(absolutePath + '.tar.gz');
    });
  });
};

async function _checkMicroservicesFogType(fog, fogTypeId, transaction) {
  const where = {
    iofogUuid: fog.uuid
  };
  const microservices = await MicroserviceManager.findAllWithDependencies(where, {}, transaction);
  if (microservices) {

    let invalidMicroservices = [];

    for (const microservice of microservices) {
      let exists = false;
      for (let image of microservice.catalogItem.images) {
        if (image.fogTypeId === fogTypeId) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        invalidMicroservices.push(microservice);
      }
    }

    if (invalidMicroservices.length > 0) {
      let errorMsg = ErrorMessages.INVALID_MICROSERVICES_FOG_TYPE;
      for (error of invalidMicroservices) {
        errorMsg = errorMsg + ' "' + error.name + '" microservice\n';
      }
      throw new Errors.ValidationError(errorMsg);
    }
  }
}

module.exports = {
  agentProvision: TransactionDecorator.generateTransaction(agentProvision),
  getAgentConfig: getAgentConfig,
  updateAgentConfig: TransactionDecorator.generateTransaction(updateAgentConfig),
  getAgentConfigChanges: TransactionDecorator.generateTransaction(getAgentConfigChanges),
  updateAgentStatus: TransactionDecorator.generateTransaction(updateAgentStatus),
  getAgentMicroservices: TransactionDecorator.generateTransaction(getAgentMicroservices),
  getAgentMicroservice: TransactionDecorator.generateTransaction(getAgentMicroservice),
  getAgentRegistries: TransactionDecorator.generateTransaction(getAgentRegistries),
  getAgentTunnel: TransactionDecorator.generateTransaction(getAgentTunnel),
  getAgentStrace: TransactionDecorator.generateTransaction(getAgentStrace),
  updateAgentStrace: TransactionDecorator.generateTransaction(updateAgentStrace),
  getAgentChangeVersionCommand: TransactionDecorator.generateTransaction(getAgentChangeVersionCommand),
  updateHalHardwareInfo: TransactionDecorator.generateTransaction(updateHalHardwareInfo),
  updateHalUsbInfo: TransactionDecorator.generateTransaction(updateHalUsbInfo),
  deleteNode: TransactionDecorator.generateTransaction(deleteNode),
  getImageSnapshot: TransactionDecorator.generateTransaction(getImageSnapshot),
  putImageSnapshot: TransactionDecorator.generateTransaction(putImageSnapshot)
};