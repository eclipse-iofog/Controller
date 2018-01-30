const path = require('path');
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
    let databaseFile = fs.readFileSync(path.join(__dirname, '../db/fog_controller.db'));
    console.log('Size of database file: ' + Math.round((databaseFile.toString().length / 1024) * 100) / 100 + ' KB');
    ComsatService.checkConnectionToComsat();
  } catch (e) {
    console.log('Error: "fog_controller.db" not found in "db" folder.');
  }
}

exports.Status = Status;