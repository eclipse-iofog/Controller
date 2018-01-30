class Help {
  static displayExtraArgumentHelp = (arg) => {
    console.log(`Unrecognized command: ${arg}`);
    console.log(`Use fog-controller help for more information`);
  }

  static displayConfigCommandHelp = () => {
    console.log(`You need to use one of the following commands:`);
    Help.displayConfigListHelp();
    Help.displayConfigAddHelp();
    Help.displayConfigRemoveHelp();
  }

  static displayConfigListHelp = () => {
    console.log(`-list
                  \t\t\tDisplays Configuration information in CLI (config table content)`);
  }

  static displayConfigAddHelp = () => {
    console.log(`-add <key> <value>
                  \tSet Configurations of fog-controller\n
                  \t\t\t\t(You can set one of these configurations: port, ssl_key, intermediate_cert, ssl_cert,\n
                  \t\t\t\temail_address, email_password, email_service, ioauthoring_port, ioauthoring_ip_address,\n
                  \t\t\t\tioauthoring_protocal)`);
  }

  static displayConfigRemoveHelp = () => {
    console.log(`-remove <key>
                  \t\tDeletes a Configuration with corresponding Key`);
  }

  static displayUserCommandHelp = () => {
    console.log(`You need to use one of the following commands:`);
    Help.displayUserListHelp();
    Help.displayUserAddHelp();
    Help.displayUserRemoveHelp();
    Help.displayUserGenerateTokenHelp();
  }

  static displayUserListHelp = () => {
    console.log(`-list
                  \t\t\t\t\t\t\t\tList down all users`);
  }

  static displayUserAddHelp = () => {
    console.log(`-add <email> <firstName> <lastName> <password>
                  \t\tCreates a new user`);
  }

  static displayUserRemoveHelp = () => {
    console.log(`-remove <email>
                  \t\t\t\t\t\tDeletes a user with corresponding email`);
  }

  static displayUserGenerateTokenHelp = () => {
    console.log(`-generateToken <email>
                  \t\t\t\t\t\t\tResets User Access Token of corresponding email`);
  }
}

exports.Help = Help;