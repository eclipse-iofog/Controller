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
const MicroserviceManager = require('../sequelize/managers/microservice-manager');
const MicroserviceService = require('../services/microservices-service');
const StraceDiagnosticManager = require('../sequelize/managers/strace-diagnostics-manager');
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager')

const changeMicroserviceStraceState = async function (data, user, isCLI, transaction) {

  const microservice = await MicroserviceService.getMicroservice(data.id, user, isCLI);
  if (microservice.iofogUuid == null) {
    throw new Errors.ValidationError()
  }

  const straceObj = {
    straceRun: data.enable,
    microserviceUuid: data.id
  };

  await StraceDiagnosticManager.updateOrCreate({microserviceUuid: data.id}, straceObj, transaction);
  await ChangeTrackingManager.updateOrCreate({iofogUuid: microservice.iofogUuid}, {diagnostics: true}, transaction)

}