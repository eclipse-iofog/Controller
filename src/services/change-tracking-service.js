/*
 *  *******************************************************************************
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

const ChangeTrackingManager = require('../database/managers/change-tracking-manager')

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
  },
  diagnostics: {
    diagnostics: true,
  },
  imageSnapshot: {
    isImageSnapshot: true,
  },
  microserviceFull: {
    microserviceConfig: true,
    microserviceList: true,
    routing: true,
  },
  microserviceCommon: {
    microserviceConfig: true,
    microserviceList: true,
  },
  microserviceList: {
    microserviceList: true,
  },
  microserviceConfig: {
    microserviceConfig: true,
  },
  microserviceRouting: {
    routing: true,
  },
  version: {
    version: true,
  },
  reboot: {
    reboot: true,
  },
  deleteNode: {
    deleteNode: true,
  },
  registries: {
    registries: true,
  },
  tunnel: {
    tunnel: true,
  },
  config: {
    config: true,
  },
})

async function create(ioFogUuid, transaction) {
  await ChangeTrackingManager.create({ iofogUuid: ioFogUuid }, transaction)
}

async function update(ioFogUuid, data, transaction) {
  await ChangeTrackingManager.update({ iofogUuid: ioFogUuid }, data, transaction)
}

async function updateIfChanged(ioFogUuid, data, transaction) {
  await ChangeTrackingManager.updateIfChanged({ iofogUuid: ioFogUuid }, data, transaction)
}

async function getByIoFogUuid(ioFogUuid, transaction) {
  return await ChangeTrackingManager.findOne({ iofogUuid: ioFogUuid }, transaction)
}

module.exports = {
  events: events,
  create: create,
  update: update,
  updateIfChanged: updateIfChanged,
  getByIoFogUuid: getByIoFogUuid,
}
