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

const Errors = require('../helpers/errors')
const Validator = require('../schemas')
const NatsInstanceManager = require('../data/managers/nats-instance-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const NatsService = require('./nats-service')

const DEFAULT_SERVER_PORT = 4222
const DEFAULT_CLUSTER_PORT = 6222
const DEFAULT_LEAF_PORT = 7422
const DEFAULT_MQTT_PORT = 8883
const DEFAULT_HTTP_PORT = 8222
const DEFAULT_JS_STORAGE_SIZE = '10g'
const DEFAULT_JS_MEMORY_STORE_SIZE = '1g'

async function getDefaultHub (transaction) {
  const hub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  if (!hub) {
    throw new Errors.NotFoundError('NATS hub not found')
  }
  return {
    host: hub.host,
    serverPort: hub.serverPort,
    clusterPort: hub.clusterPort,
    leafPort: hub.leafPort,
    mqttPort: hub.mqttPort,
    httpPort: hub.httpPort
  }
}

async function upsertDefaultHub (hubData, transaction) {
  await Validator.validate(hubData, Validator.schemas.natsHubCreate)

  const jsStorageSize = hubData.jsStorageSize != null && String(hubData.jsStorageSize).trim() !== ''
    ? NatsService.normalizeJetstreamSize(hubData.jsStorageSize, DEFAULT_JS_STORAGE_SIZE)
    : null
  const jsMemoryStoreSize = hubData.jsMemoryStoreSize != null && String(hubData.jsMemoryStoreSize).trim() !== ''
    ? NatsService.normalizeJetstreamSize(hubData.jsMemoryStoreSize, DEFAULT_JS_MEMORY_STORE_SIZE)
    : null

  const createHubData = {
    isHub: true,
    isLeaf: false,
    host: hubData.host,
    serverPort: hubData.serverPort || DEFAULT_SERVER_PORT,
    clusterPort: hubData.clusterPort || DEFAULT_CLUSTER_PORT,
    leafPort: hubData.leafPort || DEFAULT_LEAF_PORT,
    mqttPort: hubData.mqttPort || DEFAULT_MQTT_PORT,
    httpPort: hubData.httpPort || DEFAULT_HTTP_PORT,
    jsStorageSize: jsStorageSize || null,
    jsMemoryStoreSize: jsMemoryStoreSize || null
  }

  return NatsInstanceManager.updateOrCreate({ isHub: true }, createHubData, transaction)
}

module.exports = {
  getDefaultHub: TransactionDecorator.generateTransaction(getDefaultHub),
  upsertDefaultHub: TransactionDecorator.generateTransaction(upsertDefaultHub)
}
