/*
 *  *******************************************************************************
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

class AuthenticationError extends Error {
  constructor(message) {
    super(message)
    this.message = message
    this.name = 'AuthenticationError'
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = "ValidationError";
  }
}

class InvalidCredentialsError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = "InvalidCredentialsError";
  }
}

class DuplicatePropertyError extends Error {
	constructor(message) {
		super(message);
		this.message = message;
		this.name = "DuplicatePropertyError";
	}
}

module.exports = {
  AuthenticationError: AuthenticationError,
  ValidationError: ValidationError,
  InvalidCredentialsError: InvalidCredentialsError,
  DuplicatePropertyError: DuplicatePropertyError
};