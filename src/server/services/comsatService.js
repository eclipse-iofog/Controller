import async from 'async';
import querystring from 'querystring';
import https from 'https';
import SatelliteManager from '../managers/satelliteManager';
import SatelliteService from '../services/satelliteService';
import AppUtils from '../utils/appUtils';

const openPortOnRadomComsat = function(params, callback) {
  var isComsatPortOpen = false,
    iterations = 0;

  async.whilst(
    function() { // TEST
      return !(isComsatPortOpen || iterations > 5);
    },
    function(cb) { // ITERATE
      iterations++;
      async.waterfall([
        async.apply(SatelliteService.getRandomSatellite, params),
        openPortsOnComsat,
      ], function(err, result) {
        if (err) {
          console.log(err);
        } else {
          if (params.comsatPort) {
            isComsatPortOpen = true;
          } else {
            console.log('Error');
          }
        }
        cb(null, iterations);
      });
    },
    function(err, n) { // CALLBACK
      console.log(n);
      console.log(err);
      if (n > 5) {
        callback('error', 'Not able to open port on remote COMSAT. Gave up after 5 tries. Error Received : ' + params.errormessage);
      } else {
        callback(null, params);
      }
    }
  );
}

const openPortsOnComsat = function(params, callback) {
  var data = querystring.stringify({
    mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}'
  });

  var options = {
    host: params.satellite.domain,
    port: 443,
    path: '/api/v2/mapping/add',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  var httpreq = https.request(options, function(response) {
    console.log(response.statusCode);
    var output = '';
    response.setEncoding('utf8');

    response.on('data', function(chunk) {
      output += chunk;
    });

    response.on('end', function() {
      var responseObj = JSON.parse(output);
      console.log(responseObj);
      if (responseObj.errormessage) {
        params.errormessage = responseObj.errormessage;
        callback('error', responseObj.errormessage);
      } else {
        params.comsatPort = responseObj;
        callback(null, params);
      }
    });
  });

  httpreq.on('error', function(err) {
    console.log(err);
    params.errormessage = JSON.stringify(err);
    callback(null, params);
  });

  httpreq.write(data);
  httpreq.end();
}

const closePortsOnComsat = function(params, callback) {

  console.log(params.portPasscode[0]);
  if (params.portPasscode[0] && params.portPasscode[0].length > 0) {
    async.each(params.portPasscode[0], function(obj, callback) {
      var data = querystring.stringify({
        mappingid: obj.mapping_id
      });
      console.log(data);

      var options = {
        host: obj.domain,
        port: 443,
        path: '/api/v2/mapping/remove',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      var httpreq = https.request(options, function(response) {
        console.log(response.statusCode);
        var output = '';
        response.setEncoding('utf8');

        response.on('data', function(chunk) {
          output += chunk;
        });

        response.on('end', function() {
          var responseObj = JSON.parse(output);
          console.log(responseObj);
          if (responseObj.errormessage) {
            params.errormessage = responseObj.errormessage;
          }
          callback();
        });
      });

      httpreq.on('error', function(err) {
        console.log(err);
        params.errormessage = JSON.stringify(err);
        callback();
      });

      httpreq.write(data);
      httpreq.end();

    }, function(err) {
      params.errormessage = JSON.stringify(err);
      callback(null, params);
    });
  } else {
    callback(null, params);
  }
}

const closePortOnComsat = function(params, callback) {
  console.log(params.satellitePort);

  var data = querystring.stringify({
    mappingid: params.satellitePort.mappingId
  });
  console.log(data);

  var options = {
    host: params.satellite.domain,
    port: 443,
    path: '/api/v2/mapping/remove',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  var httpreq = https.request(options, function(response) {
    console.log(response.statusCode);
    var output = '';
    response.setEncoding('utf8');

    response.on('data', function(chunk) {
      output += chunk;
    });

    response.on('end', function() {
      var responseObj = JSON.parse(output);
      console.log(responseObj);
      if (responseObj.errormessage) {
        params.errormessage = responseObj.errormessage;
      }
      callback(null, params);
    });
  });

  httpreq.on('error', function(err) {
    console.log(err);
    params.errormessage = JSON.stringify(err);
    callback(null, params);
  });

  httpreq.write(data);
  httpreq.end();
}

const checkConnectionToComsat = function() {
  var data = querystring.stringify({
    mappingid: 'all'
  });
  var validCount = 0,
      inValidCount = 0,
      percentage_done = 0,
      satelliteNames = [],
      satelliteDomains = [],
      validSatelliteNames = [],
      validSatelliteDomains = [],
      inValidSatelliteNames = [],
      inValidSatelliteDomains = [],
      interval = 5 * 1000;

  SatelliteManager.findAll().then(function(satellites){
    for (var i = 0; i < satellites.length; i++){
      satelliteNames[i] = satellites[i].name;
      satelliteDomains[i] = satellites[i].domain;
    }
  });

  process.stdout.write('Percentage completed 0%');

  setTimeout( function () {
    if(satelliteDomains.length > 0){
      for (var i = 0; i < satelliteDomains.length; i++){
        setTimeout( function (i) {

        process.stdout.clearLine();  
        process.stdout.cursorTo(0); 
        percentage_done = ((i+1) / satelliteDomains.length) * 100;

        process.stdout.write('Percentage completed ' + percentage_done + '%');

        var options = {
          host: satelliteDomains[i],
          port: 443,
          path: '/api/v2/status',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data)
          }
        };

        var httpreq = https.request(options, function(response) {
          if (response.statusCode == 200){
            var output = '';
            response.setEncoding('utf8');

            response.on('data', function(chunk) {
              output += chunk;
            });
          
            response.on('end', function() {
              validSatelliteNames[validCount] = satelliteNames[i];
              validSatelliteDomains[validCount] = satelliteDomains[i];
              validCount++;
            });        
          }else{
            inValidSatelliteNames[inValidCount] = satelliteNames[i];
            inValidSatelliteDomains[inValidCount] = satelliteDomains[i];
            inValidCount++;
          }
        });

        httpreq.on('error', function(err) {
          console.log('Error: Please Check your connectivity to internet or invalid comsat domain provided.');
        });

        httpreq.write(data);
        httpreq.end();

        if (i == satelliteDomains.length - 1){
          setTimeout( function () {
            console.log("\nConnection to following Comsat(s) was successful:")
            for (var j = 0; j < validSatelliteDomains.length; j++){
              console.log(validSatelliteNames[j] + ' (' + validSatelliteDomains[j] + ')');
            }
            console.log("\nConnection to following Comsat(s) was failed:")
            for (var k = 0; k < inValidSatelliteDomains.length; k++){
              console.log(inValidSatelliteNames[k]  + ' (' + inValidSatelliteDomains[k] + ')');
            }
          }, 5000);
        }
      }, interval * i, i);
    }
   }else{
    console.log('No comsat domain found to check connection.')
   }
  }, 5000);
}

export default {
  openPortOnRadomComsat: openPortOnRadomComsat,
  closePortOnComsat: closePortOnComsat,
  closePortsOnComsat: closePortsOnComsat,
  openPortsOnComsat: openPortsOnComsat,
  checkConnectionToComsat: checkConnectionToComsat
};