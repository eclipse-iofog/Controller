'use strict';
import appConfig from './../../config.json';

const nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: appConfig.email,
        pass: appConfig.password
    }
});

module.exports = transporter;