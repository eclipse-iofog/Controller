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

import _ from 'underscore';

//src, destination
//destination should be a sequzlize object
const updateObject  = (destination, source) => {
  _.each(source, (value, key) => {            
      if(key != 'id' && key != 'createdAt' && _.has(destination.dataValues, key)){        
        if(destination[key] != source[key])
          destination[key] = source[key];
      }
  });
};

export default {
  updateObject: updateObject
}
