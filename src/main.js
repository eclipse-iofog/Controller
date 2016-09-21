#! /usr/bin/env node

import ConfigUtil from './server/utils/configUtil';
import UserManager from './server/managers/userManager';
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

    case 'user':

      if (args[1]) {
        switch (args[1]) {
          case '-list':
            UserManager.list();
            break;
          case '-add':
            UserManager.createUser(args[2], args[3], args[4]);
            break;
          case '-remove':
            UserManager.removeUser(args[2]);
            break;
          case '-generateToken':
            UserManager.generateToken(args[2]);
            break;
          default:
            console.log('Invalid flag "' + args[1] + '"');

        }
      } else {
        UserManager.list();
      }
      break;
    default:
      console.log('Invalid command "' + args[0] + '"');

  }
}

main();