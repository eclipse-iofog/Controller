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

const BaseManager = require('../managers/base-manager');
const models = require('./../models');
const Strace = models.StraceDiagnostics;

const Errors = require('../../helpers/errors');
const ErrorMessages = require('../../helpers/error-messages');

const maxBufferSize = 1e8;

class StraceManager extends BaseManager {

  getEntity() {
    return Strace
  }

  async pushBufferByMicroserviceUuid(uuid, pushingData, transaction) {
    const strace = await this.findOne({
      microserviceUuid: uuid
    }, transaction);
    if (!strace) {
      throw new Errors.NotFoundError(ErrorMessages.INVALID_NODE_ID)
    }

    let newBuffer = this._updateBuffer(strace.buffer, pushingData);
    return await this.update({
      microserviceUuid: uuid
    }, {
      buffer: newBuffer
    }, transaction);
  }

  _updateBuffer(oldBuf, pushingData) {
    let newBuffer = oldBuf + pushingData;
    let delta = newBuffer.length - maxBufferSize;
    if (delta > 0) {
      newBuffer = '[ioFogController Info] Buffer size is limited, so some of previous data was lost \n'
        + newBuffer.substring(delta);
    }
    return newBuffer;
  };
}

const instance = new StraceManager();
module.exports = instance;