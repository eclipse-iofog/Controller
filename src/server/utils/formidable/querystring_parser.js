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

// This is a buffering parser, not quite as nice as the multipart one.
// If I find time I'll rewrite this to be fully streaming as well
var querystring = require('querystring');

function QuerystringParser() {
  this.buffer = '';
};
exports.QuerystringParser = QuerystringParser;

QuerystringParser.prototype.write = function(buffer) {
  this.buffer += buffer.toString('ascii');
  return buffer.length;
};

QuerystringParser.prototype.end = function() {
  var fields = querystring.parse(this.buffer);
  for (var field in fields) {
    this.onField(field, fields[field]);
  }
  this.buffer = '';

  this.onEnd();
};