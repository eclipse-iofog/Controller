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

var util = require('util')
  , path = require('path')
  , WriteStream = require('fs').WriteStream
  , MultipartParser = require('./multipart_parser').MultipartParser
  , QuerystringParser = require('./querystring_parser').QuerystringParser
  , StringDecoder = require('string_decoder').StringDecoder
  , EventEmitter = require('events').EventEmitter;

function IncomingForm() {
  if (!(this instanceof IncomingForm)) return new IncomingForm;
  EventEmitter.call(this);

  this.error = null;
  this.ended = false;

  this.maxFieldsSize = 2 * 1024 * 1024;
  this.keepExtensions = false;
  this.uploadDir = '/tmp';
  this.encoding = 'utf-8';
  this.headers = null;
  this.type = null;

  this.bytesReceived = null;
  this.bytesExpected = null;

  this._parser = null;
  this._flushing = 0;
  this._fieldsSize = 0;
};
util.inherits(IncomingForm, EventEmitter);
exports.IncomingForm = IncomingForm;

IncomingForm.prototype.parse = function(req, cb) {
  this.pause = function() {
    try {
      req.pause();
    } catch (err) {
      // the stream was destroyed
      if (!this.ended) {
        // before it was completed, crash & burn
        this._error(err);
      }
      return false;
    }
    return true;
  };

  this.resume = function() {
    try {
      req.resume();
    } catch (err) {
      // the stream was destroyed
      if (!this.ended) {
        // before it was completed, crash & burn
        this._error(err);
      }
      return false;
    }

    return true;
  };

  this.writeHeaders(req.headers);

  var self = this;
  req
    .addListener('error', function(err) {
      self._error(err);
    })
    .addListener('data', function(buffer) {
      self.write(buffer);
    })
    .addListener('end', function() {
      if (self.error) {
        return;
      }

      var err = self._parser.end();
      if (err) {
        self._error(err);
      }
    });

  if (cb) {
    var fields = {}, files = {};
    this
      .addListener('field', function(name, value) {
        fields[name] = value;
      })
      .addListener('file', function(name, file) {
        files[name] = file;
      })
      .addListener('error', function(err) {
        cb(err, fields, files);
      })
      .addListener('end', function() {
        cb(null, fields, files);
      });
  }

  return this;
};

IncomingForm.prototype.writeHeaders = function(headers) {
  this.headers = headers;
  this._parseContentLength();
  this._parseContentType();
};

IncomingForm.prototype.write = function(buffer) {
  if (!this._parser) {
    this._error(new Error('unintialized parser'));
    return;
  }

  var bytesParsed = this._parser.write(buffer);
  if (bytesParsed !== buffer.length) {
    this._error(new Error('parser error, '+bytesParsed+' of '+buffer.length+' bytes parsed'));
  }

  this.bytesReceived += bytesParsed;
  this.emit('progress', this.bytesReceived, this.bytesExpected);

  return bytesParsed;
};

IncomingForm.prototype.pause = function() {
  // this does nothing, unless overwritten in IncomingForm.parse
  return false;
};

IncomingForm.prototype.resume = function() {
  // this does nothing, unless overwritten in IncomingForm.parse
  return false;
};

IncomingForm.prototype.onPart = function(part) {
  // this method can be overwritten by the user
  this.handlePart(part);
};

IncomingForm.prototype.handlePart = function(part) {
  var self = this;

  if (!part.filename) {
    var value = ''
      , decoder = new StringDecoder(this.encoding);

    part.addListener('data', function(buffer) {
      self._fieldsSize += buffer.length;
      if (self._fieldsSize > self.maxFieldsSize) {
        self._error(new Error('maxFieldsSize exceeded, received '+self._fieldsSize+' bytes of field data'));
        return;
      }
      value += decoder.write(buffer);
    });

    part.addListener('end', function() {
      self.emit('field', part.name, value);
    });
    return;
  }

  this._flushing++;

  var file = new WriteStream(this._uploadPath(part.filename));
  part.addListener('data', function(buffer) {
    self.pause();
    file.write(buffer, function() {
      self.resume();
    });
  });

  part.addListener('end', function() {
    file.end(function() {
      self._flushing--;
      self.emit
        ( 'file'
        , part.name
        , { path: file.path
          , filename: part.filename
          , mime: part.mime
          }
        );
      self._maybeEnd();
    });
  });
};

IncomingForm.prototype._parseContentType = function() {
  if (!this.headers['content-type']) {
    this._error(new Error('bad content-type header, no content-type'));
    return;
  }

  if (this.headers['content-type'].match(/urlencoded/i)) {
    this._initUrlencoded();
    return;
  }

  if (this.headers['content-type'].match(/multipart/i)) {
    var m;
    if (m = this.headers['content-type'].match(/boundary=([^;]+)/i)) {
      this._initMultipart(m[1]);
    } else {
      this._error(new Error('bad content-type header, no multipart boundary'));
    }
    return;
  }

  this._error(new Error('bad content-type header, unknown content-type: '+this.headers['content-type']));
};

IncomingForm.prototype._error = function(err) {
  if (this.error) {
    return;
  }

  this.error = err;
  this.pause();
  this.emit('error', err);
};

IncomingForm.prototype._parseContentLength = function() {
  if (this.headers['content-length']) {
    this.bytesReceived = 0;
    this.bytesExpected = parseInt(this.headers['content-length'], 10);
  }
};

IncomingForm.prototype._newParser = function() {
  return new MultipartParser();
};

IncomingForm.prototype._initMultipart = function(boundary) {
  this.type = 'multipart';

  var parser = new MultipartParser()
    , self = this
    , headerField
    , headerValue
    , part;

  parser.initWithBoundary(boundary);

  parser.onPartBegin = function() {
    part = new EventEmitter();
    part.headers = {};
    part.name = null;
    part.filename = null;
    part.mime = null;
    headerField = '';
    headerValue = '';
  };

  parser.onHeaderField = function(b, start, end) {
    headerField += b.toString(self.encoding, start, end);
  };

  parser.onHeaderValue = function(b, start, end) {
    headerValue += b.toString(self.encoding, start, end);
  };

  parser.onHeaderEnd = function() {
    headerField = headerField.toLowerCase();
    part.headers[headerField] = headerValue;

    var m;
    if (headerField == 'content-disposition') {
      if (m = headerValue.match(/name="([^"]+)"/i)) {
        part.name = m[1];
      }

      if (m = headerValue.match(/filename="([^;]+)"/i)) {
        part.filename = m[1].substr(m[1].lastIndexOf('\\') + 1);
      }
    } else if (headerField == 'content-type') {
      part.mime = headerValue;
    }

    headerField = '';
    headerValue = '';
  };

  parser.onHeadersEnd = function() {
    self.onPart(part);
  };

  parser.onPartData = function(b, start, end) {
    part.emit('data', b.slice(start, end));
  };

  parser.onPartEnd = function() {
    part.emit('end');
  };

  parser.onEnd = function() {
    self.ended = true;
    self._maybeEnd();
  };

  this._parser = parser;
};

IncomingForm.prototype._initUrlencoded = function() {
  this.type = 'urlencoded';

  var parser = new QuerystringParser()
    , self = this;

  parser.onField = function(key, val) {
    self.emit('field', key, val);
  };

  parser.onEnd = function() {
    self.ended = true;
    self._maybeEnd();
  };

  this._parser = parser;
};

IncomingForm.prototype._uploadPath = function(filename) {
  return path.join(this.uploadDir, filename);
};

IncomingForm.prototype._maybeEnd = function() {
  if (!this.ended || this._flushing) {
    return;
  }

  this.emit('end');
};
