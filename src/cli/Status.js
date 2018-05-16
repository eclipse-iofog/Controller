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

const path = require('path');
const fs = require('fs');
import ComsatService from '../server/services/comsatService';

class Status {
  static display = (daemon) => {
    displayDaemonStatus(daemon);
    displayDatabaseStatus();
  }
}

function displayDaemonStatus(daemon) {
  let pid = daemon.status();
  if (pid === 0) {
    console.log('Fog-Controller is not running.');
  } else {
    console.log('Fog-Controller is running at pid:' + pid);
    displayMemoryStatus();
  }
}

function displayMemoryStatus() {
  let memoryUsed = process.memoryUsage();
  console.log("Memory consumed in RAM by Fog-Controller: " + Math.round((memoryUsed.rss / 1024 / 1024) * 100) / 100 + " MB");
}

function displayDatabaseStatus() {
  try {
      let databaseFileStats = fs.statSync(path.join(__dirname, '../../../fog-controller-db/fog_controller.db'));
    console.log('Size of database file: ' + databaseFileStats.size/1024 + ' KB');
  } catch (e) {
      console.log('Error: "fog_controller.db" not found in ' + path.join(__dirname, '../../../fog-controller-db') + ' folder. ' + e);
  }
    try {
        ComsatService.checkConnectionToComsat();
  } catch (e) {
        console.log('Error: "fail to check connection to comsat ' + e);
  }
}

exports.Status = Status;