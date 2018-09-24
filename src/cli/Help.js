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

class Help {
  static displayExtraArgumentHelp(arg) {
    console.log(`
      \tUnrecognized command: ${arg}
      \tUse fog-controller help for more information`);
  }

  static displayConfigCommandHelp() {
    Help.displayConfigListHelp();
    Help.displayConfigAddHelp();
    Help.displayConfigRemoveHelp();
  }

  static displayConfigListHelp() {
    console.log(`\t\t\t-list\t\t\t\t\t\tDisplays Configuration information in CLI (config table content)`);
  }

  static displayConfigAddHelp() {
    console.log(`\t\t\t-add <key> <value>\t\t\t\tSet Configurations of fog-controller
                  \t\t\t\t\t\t\t\t(You can set one of these configurations: port, ssl_key, intermediate_cert, ssl_cert,
                  \t\t\t\t\t\t\t\temail_activation [on | off], email_address, email_password, email_service, ioauthoring_port, ioauthoring_ip_address,
                  \t\t\t\t\t\t\t\tioauthoring_protocal)`);
  }

  static displayConfigRemoveHelp() {
    console.log(`\t\t\t-remove <key>\t\t\t\t\tDeletes a Configuration with corresponding Key`);
  }

  static displayUserCommandHelp(){
    Help.displayUserListHelp();
    Help.displayUserAddHelp();
    Help.displayUserRemoveHelp();
    Help.displayUserGenerateTokenHelp();
  }

  static displayUserListHelp() {
    console.log(`\t\t\t-list\t\t\t\t\t\tList down all users`);
  }

  static displayUserAddHelp() {
    console.log(`\t\t\t-add <email> <firstName> <lastName> <password>\tCreates a new user`);
  }

  static displayUserRemoveHelp() {
    console.log(`\t\t\t-remove <email>\t\t\t\t\tDeletes a user with corresponding email`);
  }

  static displayUserGenerateTokenHelp() {
    console.log(`\t\t\t-generateToken <email>\t\t\t\tResets User Access Token of corresponding email`);
  }

  static displayComsatCommandHelp() {
    Help.displayComsatListHelp();
    Help.displayComsatAddHelp();
    Help.displayComsatRemoveHelp();
  }

  static displayProxyCommandHelp() {
	  Help.displayProxyListHelp();
	  Help.displayProxyAddHelp();
	  Help.displayProxyRemoveHelp();
  }

  static displayComsatListHelp() {
    console.log(`\t\t\t-list\t\t\t\t\t\tList down all ComSat(s)`);
  }

	static displayProxyListHelp(){
		console.log(`\t\t\t-list\t\t\t\t\t\tList down proxy config`);
	}

  static displayComsatAddHelp(){
    console.log(`\t\t\t-add <name> <domain> <publicIP> [<certFile>] \tCreates a new ComSat`);
	console.log(`\t\t\t\t\t\t [<selfSignedCerts>]`);
  }

	static displayProxyAddHelp(){
		console.log(`\t\t\t-add <username> <password> <host> <rsaKey> \tCreates proxy config`);
		console.log(`\t\t\t\t\t\t [<lport>]`);
	}

  static displayComsatRemoveHelp(){
      console.log(`\t\t\t-remove <ID>\t\t\t\t\tDeletes a ComSat with corresponding ID`);
  }

  static displayProxyRemoveHelp(){
	  console.log(`\t\t\t-remove \t\t\t\t\tDeletes proxy config`);
  }

  static displayGeneralHelp(){
    displayHelpHeader();
    console.log(`\tconfig`);
    Help.displayConfigListHelp();
    Help.displayConfigAddHelp();
    Help.displayConfigRemoveHelp();
    console.log(`\tcomsat`);
    Help.displayComsatListHelp();
    Help.displayComsatAddHelp();
    Help.displayComsatRemoveHelp();
	console.log(`\tproxy`);
	Help.displayProxyListHelp();
	Help.displayProxyAddHelp();
	Help.displayProxyRemoveHelp();
    console.log(`\tuser`);
    Help.displayUserListHelp();
    Help.displayUserAddHelp();
    Help.displayUserRemoveHelp();
    Help.displayUserGenerateTokenHelp();
    displayHelpFooter();
  }
}

function displayHelpHeader() {
  console.log(`\tUsage 1: fog-controller [OPTION]
      \tUsage 2: fog-controller [COMMAND] <Argument>
      \tUsage 3: fog-controller [COMMAND] <key> <value>
      

      \tCommand\t\tArguments\t\t\t\t\tMeaning
      \t=======\t\t=========\t\t\t\t\t=======`);
}

function displayHelpFooter() {
  console.log(`\thelp\t\t\t\t\t\t\t\tShows this message
  \tstart\t\t\t\t\t\t\t\tStarts fog-controller
  \tstatus\t\t\t\t\t\t\t\tShows status of fog-controller
  \tstop\t\t\t\t\t\t\t\tStops fog-controller
  \tversion\t\t\t\t\t\t\t\tDisplays Version and License
  

  \tReport bugs to: edgemaster@iofog.org
  \tioFog home page: http://iofog.org
  \tFor users with Eclipse accounts, report bugs to: https://bugs.eclipse.org/bugs/enter_bug.cgi?product=iofog
  `);
}

exports.Help = Help;