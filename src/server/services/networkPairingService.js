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

const NetworkPairingManager = require('../managers/networkPairingManager');
const AppUtils = require('../utils/appUtils');
const _ = require('underscore');

const concatNetwotkElementAndNormalElement = function(params, callback) {
  params.otherTrackElementIds = params.networkElementId.concat(_.uniq(_.pluck(_.filter(params.otherRoutingList,
    function(item) {
      return item.is_network_connection !== 1;
    }), 'publishing_element_id')));
  callback(null, params);
}

const concatNetwotkElement2AndNormalElement = function(params, callback) {
  params.outputOtherTrackElementId2 = params.networkElementId2.concat(_.uniq(_.pluck(_.filter(params.outputOtherRoutingList,
    function(item) {
      return item.is_network_connection !== 1;
    }), 'destination_element_id')));
  callback(null, params);
}

const createNetworkPairing = function(props, params, callback) {
  let networkPairingObj = {
    instanceId1: AppUtils.getProperty(params, props.instanceId1),
    instanceId2: AppUtils.getProperty(params, props.instanceId2),
    elementId1: AppUtils.getProperty(params, props.elementId1),
    elementId2: AppUtils.getProperty(params, props.elementId2),
    networkElementId1: AppUtils.getProperty(params, props.networkElementId1),
    networkElementId2: AppUtils.getProperty(params, props.networkElementId2),
    isPublicPort: props.isPublic,
    elemen1PortId: AppUtils.getProperty(params, props.elementPortId),
    satellitePortId: AppUtils.getProperty(params, props.satellitePortId)
  };

  NetworkPairingManager
    .create(networkPairingObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Network pairing', callback));
}

const deleteNetworkPairing = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  NetworkPairingManager
    .deleteByElementId(elementId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteNetworkPairingByElementId1 = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  NetworkPairingManager
    .deleteByElementId1(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteNetworkPairingById = function(props, params, callback) {
  let networkPairingId = AppUtils.getProperty(params, props.networkPairingId);

  NetworkPairingManager
    .deleteById(networkPairingId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const findByElementInstancePortId = function(props, params, callback) {
  let elementInstancePortData = AppUtils.getProperty(params, props.elementInstancePortData);

  NetworkPairingManager
    .findByElemen1PortIds(_.pluck(elementInstancePortData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const findOtherTrackByUuids = function(params, callback) {
  NetworkPairingManager
    .findNetworkPairingElemenId1ByUuids(_.uniq(_.pluck(_.where(params.otherRoutingList, {
      is_network_connection: 1
    }), 'publishing_element_id')))
    .then(AppUtils.onFind.bind(null, params, 'networkElementId', 'networkElementId not found.', callback));
}

const findOutputOtherElementInfoByUuids = function(params, callback) {
  NetworkPairingManager
    .findNetworkPairingElemenId2ByUuids(_.uniq(_.pluck(_.where(params.outputOtherRoutingList, {
      is_network_connection: 1
    }), 'destination_element_id')))
    .then(AppUtils.onFind.bind(null, params, 'networkElementId2', 'networkElementId2 not found.', callback));
}

const getNetworkPairing = function(props, params, callback) {
  let networkPairingId = AppUtils.getProperty(params, props.networkPairingId);

  NetworkPairingManager
    .findById(networkPairingId)
    .then(AppUtils.onFind.bind(null, params, 'networkPairing', 'Cannot find Network Pairing Instance', callback));
}

const getNetworkPairingByFogAndElement = function(props, params, callback) {

  let instanceId1 = AppUtils.getProperty(params, props.instanceId1),
    instanceId2 = AppUtils.getProperty(params, props.instanceId2),
    elementId1 = AppUtils.getProperty(params, props.elementId1),
    elementId2 = AppUtils.getProperty(params, props.elementId2);

  NetworkPairingManager
    .findByFogAndElement(instanceId1, instanceId2, elementId1, elementId2)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Network pairing', callback));
}

const findByElementInstanceIds = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  NetworkPairingManager
    .findByElementIds(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

module.exports =  {
  concatNetwotkElementAndNormalElement: concatNetwotkElementAndNormalElement,
  concatNetwotkElement2AndNormalElement: concatNetwotkElement2AndNormalElement,
  createNetworkPairing: createNetworkPairing,
  deleteNetworkPairing: deleteNetworkPairing,
  deleteNetworkPairingById: deleteNetworkPairingById,
  deleteNetworkPairingByElementId1: deleteNetworkPairingByElementId1,
  findByElementInstanceIds: findByElementInstanceIds,
  findByElementInstancePortId: findByElementInstancePortId,
  findOutputOtherElementInfoByUuids: findOutputOtherElementInfoByUuids,
  findOtherTrackByUuids: findOtherTrackByUuids,
  getNetworkPairing: getNetworkPairing,
  getNetworkPairingByFogAndElement: getNetworkPairingByFogAndElement
};