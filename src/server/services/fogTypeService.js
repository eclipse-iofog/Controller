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

import FogTypeManager from '../managers/fogTypeManager';
import AppUtils from '../utils/appUtils';

const getFogTypeDetail = function(props, params, callback) {
  let fogTypeIdProp = AppUtils.getProperty(params, props.fogTypeId),
      fogTypeId = Object.is(fogTypeIdProp, undefined) ? 0 : fogTypeIdProp;

  FogTypeManager
    .findFogTypeById(fogTypeId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Unable to find fogType details', callback));
}

//TODO: it looks like this function is the same as previous. check it and delete if possible
const getFogTypeDetails = function(props, params, callback) {
  FogTypeManager
    .findFogTypeById(props.fogTypeId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Unable to find fogType details', callback));
}

const getFogTypesList = function(props, params, callback) {

  FogTypeManager
    .getFogTypes()
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to get Fog Types List', callback));
}

const getFogTypesListForNodePage = function (props, params, callback) {
  FogTypeManager
    .getDirectlySelectionableFogTypes()
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to get Fog Types List', callback));
};

export default {
  getFogTypeDetail: getFogTypeDetail,
  getFogTypeDetails: getFogTypeDetails,
  getFogTypesList: getFogTypesList,
  getFogTypesListForNodePage: getFogTypesListForNodePage
};