
/*
 * Software Name : eclipse-iofog/Controller
 * Version: 2.0.x
 * SPDX-FileCopyrightText: Copyright (c) 2020-2020 Orange
 * SPDX-License-Identifier: EPL-2.0
 *
 * This software is distributed under the <license-name>,
 * the text of which is available at http://www.eclipse.org/legal/epl-2.0
 * or see the "license.txt" file for more details.
 *
 * Author: Franck Roudet
 */

const { expect } = require('chai')
const sinon = require('sinon')
const FogService = require('../../../src/services/iofog-service')

const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

const { rvaluesVarSubstition } = require('../../../src/helpers/template-helper')

const lget = require('lodash').get

describe('rvalues variable substition and scripting', () => {
  def('sandbox', () => sinon.createSandbox())
  def('user', () => ({
    id: 1
  }))
  def('externalPort', () => 1882)

  async function subsForFileName(filename, context = {} ) {
    // Get document, or throw exception on error
    let doc = yaml.safeLoad(fs.readFileSync(path.join(__dirname, filename), 'utf8'))
    Object.assign( context, { self: doc, microservices: [ { iofogUuid: 'edai-smartbuilding-rules-engines' }], 'external-port': $externalPort} )
    // console.log('source doc: %j', doc)
    let response = await rvaluesVarSubstition(doc, context, $user)

    // console.log('subs: %j', response)
    return response
  }

  describe('yaml source parsed to json', () => {
    def('context', () => {})
    def('subject', () => subsForFileName($filename, $context))

    beforeEach(() => {
      $sandbox.stub(FogService, 'getFogEndPoint').resolves({ uuid: 'edai-smartbuilding-rules-engines', host: 'http://local:666/'})
    })

    afterEach(() => {
      $sandbox.restore()
    })

    context('basic substitution', async () => {
      def('filename', () => ('./simple.yml'))
      it('not change the type of attribute value withoug template expression', async () => {
        let subs = await $subject
        expect(subs.spec.microservices[0].container.ports[0].external).to.be.a('number').and.equal($externalPort)
        expect(subs.spec.microservices[0].container.rootHostAccess).to.be.a('boolean').and.equal(false)
        expect(subs.spec.microservices[0].container.volumes).to.be.an('array').that.is.empty
      })
      it('not change values without template expression', async () => {
        let subs = await $subject
        expect(subs.kind).equal('Application')
      })
      it('replaces simple variable expressions', async () => {
        let subs = await $subject
        expect(subs.spec.microservices[0].container.env.find( el => el.key === 'selfname').value).equal(subs.metadata.name)
      })
      it('applies standard liquidjs filter', async () => {
        let subs = await $subject
        expect(subs.spec.microservices[0].container.env.find( el => el.key === 'selfnameU').value).equals(subs.metadata.name.toUpperCase())
      })
      it('applies filter findAgent', async () => {
        let subs = await $subject
        expect(subs.spec.microservices[0].container.env.find( el => el.key === 'selfnameA').value).equals('http://local:666/')
      })
    })
  
    context('simple Application kind substitution', async () => {
      def('filename', () => ('./app.yml'))
      it('spreads application name in microservices', async () => {
        let subs = await $subject
        expect(subs.spec.microservices[0].container.env.find( el => el.key === 'selfname').value).to.be.a('string').and.equal(subs.metadata.name)
        expect(subs.spec.microservices[1].container.env.find( el => el.key === 'selfname').value).equal(subs.metadata.name)
      })
      it('sets attributes in same object', async () => {
        let subs = await $subject
        expect(subs.spec.microservices[0].container.env.find( el => el.key === 'https_proxy').value).equal(subs.spec.microservices[0].container.env.find( el => el.key === 'http_proxy').value)
      })
      it('sets attributes from other object',  async () => {
        let subs = await $subject
        expect(subs.spec.microservices[1].container.env.find( el => el.key === 'sharedToken').value).equal(subs.spec.microservices[0].container.env.find( el => el.key === 'sharedToken').value)
        expect(subs.spec.microservices[1].container.env.find( el => el.key === 'http_proxy').value).equal(subs.spec.microservices[0].container.env.find( el => el.key === 'http_proxy').value)
        expect(subs.spec.microservices[1].container.env.find( el => el.key === 'https_proxy').value).equal(subs.spec.microservices[0].container.env.find( el => el.key === 'http_proxy').value)
        expect(subs.spec.microservices[1].container.env.find( el => el.key === 'rulesenginePORT').value).equal(subs.spec.microservices[0].container.ports[0].external.toString())
      })
    })
  })
})