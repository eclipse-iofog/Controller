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

  if (req.body && Object.hasOwn(req.body, 'semver')) {
    fogVersionCommand.semver = req.body.semver
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
  createFogEndPoint,
  updateFogEndPoint,
  deleteFogEndPoint,
  getFogEndPoint,
  getFogListEndPoint,
  generateProvisioningKeyEndPoint: (generateProvisionKeyEndPoint),
  setFogVersionCommandEndPoint,
  setFogRebootCommandEndPoint,
  getHalHardwareInfoEndPoint,
  getHalUsbInfoEndPoint,
  setFogPruneCommandEndPoint,
  enableNodeExecEndPoint,
  disableNodeExecEndPoint
}
