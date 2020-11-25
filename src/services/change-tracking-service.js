/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */
const moment = require('moment')
const Op = require('sequelize').Op

const ChangeTrackingManager = require('../data/managers/change-tracking-manager')

const events = Object.freeze({
  clean: {
    config: false,
    version: false,
    reboot: false,
    deleteNode: false,
    microserviceList: false,
    microserviceConfig: false,
    routing: false,
    registries: false,
    tunnel: false,
    diagnostics: false,
    isImageSnapshot: false,
    prune: false,
    routerChanged: false
  },
  diagnostics: {
    diagnostics: true
  },
  imageSnapshot: {
    isImageSnapshot: true
  },
  microserviceFull: {
    microserviceConfig: true,
    microserviceList: true,
    routing: true
  },
  microserviceCommon: {
    microserviceConfig: true,
    microserviceList: true
  },
  microserviceList: {
    microserviceList: true
  },
  microserviceConfig: {
    microserviceConfig: true
  },
  microserviceRouting: {
    routing: true
  },
  edgeResources: {
    linkedEdgeResources: true
  },
  version: {
    version: true
  },
  reboot: {
    reboot: true
  },
  deleteNode: {
    deleteNode: true
  },
  registries: {
    registries: true
  },
  tunnel: {
    tunnel: true
  },
  routerChanged: {
    routerChanged: true
  },
  config: {
    config: true
  },
  prune: {
    prune: true
  }
})

async function create (ioFogUuid, transaction) {
  await ChangeTrackingManager.create({ iofogUuid: ioFogUuid, lastUpdated: moment().toISOString() }, transaction)
}

async function update (ioFogUuid, data, transaction) {
  await ChangeTrackingManager.create({ ...data, iofogUuid: ioFogUuid, lastUpdated: moment().toISOString() }, transaction)
}

async function updateIfChanged (ioFogUuid, data, transaction) {
  await ChangeTrackingManager.create({ ...data, iofogUuid: ioFogUuid, lastUpdated: moment().toISOString() }, transaction)
}

async function resetIfNotUpdated (ioFogUuid, lastUpdated, transaction) {
  await ChangeTrackingManager.delete({ iofogUuid: ioFogUuid, lastUpdated: { [Op.lte]: lastUpdated } }, transaction)
}

async function getByIoFogUuid (ioFogUuid, transaction) {
  return ChangeTrackingManager.findAll({ iofogUuid: ioFogUuid }, transaction)
}

module.exports = {
  events,
  create,
  update,
  updateIfChanged,
  getByIoFogUuid,
  resetIfNotUpdated
}
