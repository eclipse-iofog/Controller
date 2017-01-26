import fogControllerConfigManager from '../managers/fogControllerConfigManager';

const configList = function() {
  fogControllerConfigManager.list()
  	.then(function(config) {
        if (config && config.length > 0) {
        	console.log('\n\nFollowing is the configuration information:');
        	for (var i = 0; i < config.length; i++){
        		console.log(config[i].key + ' | ' + config[i].value);
        	}
        }else{
        	console.log('\n\nNo Configuration Data Found.');
        }
    })
}
export default {
configList: configList
}