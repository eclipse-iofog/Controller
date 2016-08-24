const path = require('path');
const express = require('express');

import appUtils from './server/utils/appUtils';
import constants from './server/constants.js';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import expressSession from 'express-session';
import baseController from './server/controllers/baseController';
import fabricController from './server/controllers/api/fabricController';
import provisionKeyController from './server/controllers/api/provisionKeyController';
import instanceStatusController from './server/controllers/api/instanceStatusController';
import instanceConfigController from './server/controllers/api/instanceConfigController';
import instanceContainerListController from './server/controllers/api/instanceContainerListController';
import instanceChangesController from './server/controllers/api/instanceChangesController';
import instanceRegistriesController from './server/controllers/api/instanceRegistriesController';
import instanceRoutingController from './server/controllers/api/instanceRoutingController';
import instanceContainerConfigController from './server/controllers/api/instanceContainerConfigController';

import session from 'express-session';

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))
// parse application/json
app.use(bodyParser.json())
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(cookieParser());


app.set('views', path.join(__dirname, 'views'));

app.use('', baseController);
app.use('', fabricController);
app.use('', provisionKeyController);
app.use('', instanceStatusController);
app.use('', instanceConfigController);
app.use('', instanceContainerListController);
app.use('', instanceChangesController);
app.use('', instanceRegistriesController);
app.use('', instanceRoutingController);
app.use('', instanceContainerConfigController);

//generic error handler
app.use((err, req, res, next) => {
  console.log('App crashed with error: ' + err);
  console.log('App crashed with stack: ' + err.stack);
  res.status(500).send('Hmm, what you have encountered is unexpected. If problem persists, contact app provider.');
});

app.listen(constants.PORT, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', constants.PORT, constants.PORT);
});
