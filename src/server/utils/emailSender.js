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

'use strict';
const appConfig = require('./../../config.json');
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