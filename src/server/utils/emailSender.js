'use strict';
import appConfig from './../../config.json';
require('dotenv').config();
const nodemailer = require('nodemailer');
let smtpTransport = require('nodemailer-smtp-transport');

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport(smtpTransport({
    service: process.env.service,
    auth: {
        user: process.env.email,
        pass: process.env.password
    }
}));

module.exports = transporter;