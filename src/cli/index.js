const {Version} = require('./Version');

class CLI {
  constructor(args) {
    this.args = args;

    switch (args[0]) {
      case 'version':
        this.showVersion();
        break;
      case 'config':
                if (args[1]) {
                 switch (args[1]) {
                   case '-list':
                     FogControllerConfigService.configList();
                   break;
         
                   case '-add':
                     key = args[2];
                     value = args[3];
                     try {
                       if(key && value){
                         var lowerKey = key.toLowerCase();
                         ConfigUtil.setConfigParam(lowerKey, value);
                       }else{
                         console.log('\nPlease provide values in following order:\n fog-controller config -add <key> <value>');
                       }
                     } catch (exception) {
                       console.log(exception);
                     }
                     break;
                   
                   case '-remove':
                     key = args[2];
                       try {
                         if(key){
                           var lowerKey = key.toLowerCase();
                           FogControllerConfigManager.deleteConfig(lowerKey);
                         }else{
                           console.log('\nPlease provide values in following order:\n fog-controller config -remove <key>');
                         }
                       } catch (exception) {
                       console.log(exception);
                     }
                     break;
                   default:
                     console.log('Invalid flag "' + args[1] + '"');
                 }
               }else {
                 FogControllerConfigService.configList();
               }
               break;
         
             case 'help':
                 displayHelp();
               break;
         
             case 'status':
               var result = daemon.status();
               if (result == 0){
                 console.log('Fog-Controller is not running.');
               }else{
                 console.log('Fog-Controller is running at pid:' + result);
                 var memoryUsed = process.memoryUsage();
                 console.log("Memory consumed in RAM by Fog-Controller: " + Math.round((memoryUsed.rss/1024/1024) * 100) /100 + " MB");
               }
               try{
                 var databaseFile = fs.readFileSync(path.join(__dirname ,'../db/fog_controller.db'));
                 console.log('Size of database file: ' + Math.round((databaseFile.toString().length/1024)*100)/100 + ' KB');
                 ComsatService.checkConnectionToComsat();
               }catch(e){
                 console.log('Error: "fog_controller.db" not found in "db" folder.');
               }
               break;
         
             case 'start':
               ConfigUtil.getAllConfigs().then(() => {
                 var dbPort = ConfigUtil.getConfigParam(constants.CONFIG.port),
                 sslKey = ConfigUtil.getConfigParam(constants.CONFIG.ssl_key),
                 sslCert = ConfigUtil.getConfigParam(constants.CONFIG.ssl_cert),
                 intermedKey = ConfigUtil.getConfigParam(constants.CONFIG.intermediate_cert);
         
                 if(!dbPort){
                   dbPort = appConfig.port;
                 }
         
                 var result = daemon.status();
                 if (result == 0){
                   var count = 0;
                   daemon.start();
         
                   var refreshIntervalId = setInterval(function(){
                     count ++;
                     var pid = daemon.status();
                     if (pid == 0){
                       console.log('Error: ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.');
                       clearInterval(refreshIntervalId);
                     }else if(count == 5){
                       if (sslKey && sslCert && intermedKey) {
                         console.log('==> 🌎 HTTPS server listening on port %s. Open up https://localhost:%s/ in your browser.', dbPort, dbPort);
                       }else{
                         console.log('==> 🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.', dbPort, dbPort);
                       }
                       console.log('Fog-Controller has started at pid: ' + pid);
                       clearInterval(refreshIntervalId);
                     }
                   }, 1000);
                 }else{
                   console.log("fog-controller already running. PID: " + result);
                 }
               });
               break;
         
             case 'stop':
                 daemon.stop();
               break;
         
             case 'user':
               if (args[1]) {
                 switch (args[1]) {
                   case '-list':
                     UserManager.list();
                     break;
                   case '-add':
                     UserManager.createUser(args[2], args[3], args[4], args[5]);
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
         
             case 'comsat':
               if (args[1]) {
                 switch (args[1]) {
                   case '-list':
                     SatelliteManager.list();
                     break;
                   case '-add':
                     SatelliteManager.createSatellite(args[2], args[3], args[4]);
                     break;
                   case '-remove':
                     SatelliteManager.removeSatellite(args[2]);
                     break;
                   default:
                     console.log('Invalid flag "' + args[1] + '"');
                 }
               } else {
                 SatelliteManager.list();
               }
               break;
            
            default:
                 displayHelp();
               break;
           }
    }

    showVersion = () => {
        Version.display(this.args);
    }
}

exports.CLI = CLI;