#! /usr/bin/env node

import ConfigUtil from './server/utils/configUtil';
import Server from './server';

function main() {
  let key,
    value,
    args = process.argv.slice(2);

  switch (args[0]) {
    case 'set':
      key = args[1];
      value = args[2];

      try {
        ConfigUtil.setConfigParam(key, value);
        console.log('Property "' + key + '" has been updated successfully.');
      } catch (exception) {
        console.log(exception);
      }
      break;

    case 'start':
      console.log("Starting Fabric Controller ...");
      Server.startServer(args[1]);
      break;
  }
}

main();