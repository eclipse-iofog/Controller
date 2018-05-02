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