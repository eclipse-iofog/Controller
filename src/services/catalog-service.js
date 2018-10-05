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

const AppHelper = require('../helpers/app-helper');

const createCatalogItem = async function (req, user) {

	AppHelper.validateFields(req.body,
		["name", "description", "category", "containersImages", "publisher", "diskRequired", "ramRequired", "picture",
			"isPublic", "registryId", "inputType", "inputFormat", "outputType", "outputFormat", "configExample"]);
	AppHelper.validateFields(req.body.containersImages, ["x86ContainerImage", "armContainerImage"]);
	_validateUserInfo(user);


}

const _validateCatalogItemInfo = function (catalogItem) {
	if (!AppHelper.isValidname(catalogItem.name)) {
		throw new Errors.ValidationError('Catalog item creation failed: Please enter a valid name.');
	} else if (!AppHelper.isValidNumber(catalogItem.diskRequired)) {
		throw new Errors.ValidationError('Catalog item creation failed: property diskRequired is not number.');
	} else if (!AppHelper.isValidNumber(catalogItem.ramRequired)) {
		throw new Errors.ValidationError('Catalog item creation failed: property ramRequired is not number.');
	} else if (!AppHelper.isValidBoolean(catalogItem.isPublic)) {
		throw new Errors.ValidationError('Catalog item creation failed: property isPublic is not boolean.');
	} else if (!AppHelper.isValidName(catalogItem.registryId)) {
		throw new Errors.ValidationError('Catalog item creation failed: property registryId is not number.');
	}
}