/*
 *  *******************************************************************************
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

const FogService = require('../services/iofog-service')
const qs = require('qs')

async function createFogEndPoint (req) {
  const newFog = req.body
  return FogService.createFogEndPoint(newFog, false)
}

async function updateFogEndPoint (req) {
  const updateFog = req.body
  updateFog.uuid = req.params.uuid
  return FogService.updateFogEndPoint(updateFog, false)
}

async function deleteFogEndPoint (req) {
  const deleteFog = {
    uuid: req.params.uuid
  }
  return FogService.deleteFogEndPoint(deleteFog, false)
}

async function getFogEndPoint (req) {
  const getFog = {
    uuid: req.params.uuid
  }

  return FogService.getFogEndPoint(getFog, false)
}

async function getFogListEndPoint (req) {
  // const isSystem = req.query && req.query.system ? req.query.system === 'true' : false
  const query = qs.parse(req.query)
  // return FogService.getFogListEndPoint(query.filters, false, isSystem)
  return FogService.getFogListEndPoint(query.filters, false)
}

async function generateProvisionKeyEndPoint (req) {
  const fog = {
    uuid: req.params.uuid
  }

  return FogService.generateProvisioningKeyEndPoint(fog, false)
}

async function setFogVersionCommandEndPoint (req) {
  const fogVersionCommand = {
    uuid: req.params.uuid,
    versionCommand: req.params.versionCommand
  }

  return FogService.setFogVersionCommandEndPoint(fogVersionCommand, false)
}

async function setFogRebootCommandEndPoint (req) {
  const fog = {
    uuid: req.params.uuid
  }

  return FogService.setFogRebootCommandEndPoint(fog, false)
}

async function getHalHardwareInfoEndPoint (req) {
  const uuidObj = {
    uuid: req.params.uuid
  }
  return FogService.getHalHardwareInfoEndPoint(uuidObj, false)
}

async function getHalUsbInfoEndPoint (req) {
  const uuidObj = {
    uuid: req.params.uuid
  }
  return FogService.getHalUsbInfoEndPoint(uuidObj, false)
}

async function setFogPruneCommandEndPoint (req) {
  const fog = {
    uuid: req.params.uuid
  }

  return FogService.setFogPruneCommandEndPoint(fog, false)
}

async function enableNodeExecEndPoint (req) {
  const execData = {
    uuid: req.params.uuid,
    image: req.body.image
  }

  return FogService.enableNodeExecEndPoint(execData, false)
}

async function disableNodeExecEndPoint (req) {
  const fogData = {
    uuid: req.params.uuid
  }

  return FogService.disableNodeExecEndPoint(fogData, false)
}

module.exports = {
  createFogEndPoint: (createFogEndPoint),
  updateFogEndPoint: (updateFogEndPoint),
  deleteFogEndPoint: (deleteFogEndPoint),
  getFogEndPoint: (getFogEndPoint),
  getFogListEndPoint: (getFogListEndPoint),
  generateProvisioningKeyEndPoint: (generateProvisionKeyEndPoint),
  setFogVersionCommandEndPoint: (setFogVersionCommandEndPoint),
  setFogRebootCommandEndPoint: (setFogRebootCommandEndPoint),
  getHalHardwareInfoEndPoint: (getHalHardwareInfoEndPoint),
  getHalUsbInfoEndPoint: (getHalUsbInfoEndPoint),
  setFogPruneCommandEndPoint: (setFogPruneCommandEndPoint),
  enableNodeExecEndPoint: (enableNodeExecEndPoint),
  disableNodeExecEndPoint: (disableNodeExecEndPoint)
}
