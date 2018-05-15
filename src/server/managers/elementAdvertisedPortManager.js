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

/**
 * @file elementAdvertisedPortManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the element Model.
 */

import ElementAdvertisedPort from './../models/elementAdvertisedPort';
import BaseManager from './baseManager';

class ElementAdvertisedPortManager extends BaseManager {
  getEntity() {
    return ElementAdvertisedPort;
  }

  findElementAdvertisedPortByElementIds(elementIds) {
    return ElementAdvertisedPort.findAll({
      where: {
        element_id: {
          $in: elementIds
        }
      }
    });
  }
}

const instance = new ElementAdvertisedPortManager();
export default instance;
