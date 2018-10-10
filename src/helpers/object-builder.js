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

class ObjectBuilder {
  constructor() {
    this.obj = {}
  }

  popObj() {
    const popObj = this.obj
    this.obj = {}
    return popObj
  }

  pushFieldIfValExists(fieldName, val) {
    if (val !== undefined) {
      this.obj[fieldName] = val
    }
    return this
  }

  pushRequiredFieldWithCondition(fieldName, condition, ifTrueVal, ifElseVal) {
    if (condition) {
      this.obj[fieldName] = ifTrueVal
    } else {
      this.obj[fieldName] = ifElseVal
    }

    return this
  }

  pushOptionalFieldWithCondition(fieldName, condition, ifTrueVal, ifElseVal) {
    if (condition) {
      this.obj[fieldName] = ifTrueVal
    } else if (ifElseVal != null){
      this.obj[fieldName] = ifElseVal
    }

    return this
  }
}

module.exports = ObjectBuilder