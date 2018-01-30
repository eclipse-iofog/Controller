class Help {
  static displayExtraArgumentHelp = (arg) => {
    console.log(`Unrecognized command: ${arg}`);
    console.log(`You don't need to yse any parameters`);
  }

  static displayConfigCommandHelp = () => {
    console.log(`You need to use one of the following commands:`);
    Help.displayConfigListHelp();
    Help.displayConfigAddHelp();
    Help.displayConfigRemoveHelp();
  }

  static displayConfigListHelp = () => {
    console.log(`-list
                  \t\t\tDisplays Configuration information in CLI (config table content)\n`);
  }

  static displayConfigAddHelp = () => {
    console.log(`-add <key> <value>
                  \tSet Configurations of fog-controller\n
                  \t\t\t\t(You can set one of these configurations: port, ssl_key, intermediate_cert, ssl_cert,\n
                  \t\t\t\temail_address, email_password, email_service, ioauthoring_port, ioauthoring_ip_address,\n
                  \t\t\t\tioauthoring_protocal)\n`);
  }

  static displayConfigRemoveHelp = () => {
    console.log(`-remove <key>
                  \t\tDeletes a Configuration with corresponding Key`);
  }
}

exports.Help = Help;