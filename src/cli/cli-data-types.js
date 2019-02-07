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

/**
 * @return {number}
 */
function Integer(value) {
  return Number(value)
}

/**
 * @return {number}
 */
function Float(value) {
  return Number(value)
}

module.exports = {
  Integer: Integer,
  Float: Float
}