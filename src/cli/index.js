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

const { Version } = require('./Version');
const { Config } = require('./Config');
const { Status } = require('./Status');
const { Start } = require('./Start');
const { User } = require('./User');
const { Comsat } = require('./Comsat');
const { Proxy } = require('./Proxy');
const { Help } = require('./Help');

class CLI {
  constructor(args) {
    this.args = args;
  }

  run = (daemon) => {
    switch (this.args[0]) {
      case 'version':
        return Version.display(this.args);
      case 'config':
        let config = new Config(this.args.slice(1));
        return config.run();
      case 'status':
        return Status.display(daemon);
      case 'start':
        return Start.run(daemon);
      case 'stop':
        return daemon.stop();
      case 'user':
        let user = new User(this.args.slice(1));
        return user.run();
      case 'comsat':
        let comsat = new Comsat(this.args.slice(1));
        return comsat.run();
      case 'proxy':
        let proxy = new Proxy(this.args.slice(1));
        return proxy.run();
      case 'help':
      default:
        Help.displayGeneralHelp();
    }
  }
}

exports.CLI = CLI;