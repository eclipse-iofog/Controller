const {expect} = require('chai')
const sinon = require('sinon')

const CatalogController = require('../../../src/controllers/catalog-controller')
const CatalogService = require('../../../src/services/catalog-service')

describe('Catalog Controller', () => {
  def('subject', () => CatalogController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createCatalogItemEndPoint()', () => {
    def('user', () => 'user!')

    def('name', () => 'testName')
    def('description', () => 'testDescription')
    def('category', () => 'testCategory')
    def('containerImage', () => 'testContainerImage')
    def('fogTypeId', () => 'testFogTypeId')
    def('images', () => [{
      containerImage: $containerImage,
      fogTypeId: $fogTypeId,
    }])
    def('publisher', () => 'testPublisher')
    def('diskRequired', () => 15)
    def('ramRequired', () => 25)
    def('picture', () => 'testPicture')
    def('isPublic', () => false)
    def('registryId', () => 5)
    def('inputInfoType', () => 'testInfoType')
    def('inputInfoFormat', () => 'testInfoFormat')
    def('inputType', () => ({
      infoType: $inputInfoType,
      infoFormat: $inputInfoFormat,
    }))
    def('outputInfoType', () => 'testInfoType')
    def('outputInfoFormat', () => 'testInfoFormat')
    def('outputType', () => ({
      infoType: $outputInfoType,
      infoFormat: $outputInfoFormat,
    }))
    def('configExample', () => '{}')

    def('req', () => ({
      body: {
        name: $name,
        description: $description,
        category: $category,
        images: $images,
        publisher: $publisher,
        diskRequired: $diskRequired,
        ramRequired: $ramRequired,
        picture: $picture,
        isPublic: $isPublic,
        registryId: $registryId,
        inputType: $inputType,
        outputType: $outputType,
        configExample: $configExample,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.createCatalogItemEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(CatalogService, 'createCatalogItem').returns($response)
    })

    it('calls CatalogService.createCatalogItem with correct args', async () => {
      await $subject
      expect(CatalogService.createCatalogItem).to.have.been.calledWith({
        name: $name,
        description: $description,
        category: $category,
        images: $images,
        publisher: $publisher,
        diskRequired: $diskRequired,
        ramRequired: $ramRequired,
        picture: $picture,
        isPublic: $isPublic,
        registryId: $registryId,
        inputType: $inputType,
        outputType: $outputType,
        configExample: $configExample,
      }, $user)
    })

    context('when CatalogService#createCatalogItem fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService#createCatalogItem succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.listCatalogItemsEndPoint()', () => {
    def('user', () => 'user!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.listCatalogItemsEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(CatalogService, 'listCatalogItems').returns($response)
    })

    it('calls CatalogService.listCatalogItems with correct args', async () => {
      await $subject
      expect(CatalogService.listCatalogItems).to.have.been.calledWith($user, false)
    })

    context('when CatalogService#listCatalogItems fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService#listCatalogItems succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })


  describe('.listCatalogItemEndPoint()', () => {
    def('user', () => 'user!')
    def('id', () => 15)

    def('req', () => ({
      params: {
        id: $id,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.listCatalogItemEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(CatalogService, 'getCatalogItem').returns($response)
    })

    it('calls CatalogService.getCatalogItem with correct args', async () => {
      await $subject
      expect(CatalogService.getCatalogItem).to.have.been.calledWith($id, $user, false)
    })

    context('when CatalogService#getCatalogItem fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService#getCatalogItem succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.deleteCatalogItemEndPoint()', () => {
    def('user', () => 'user!')
    def('id', () => 15)

    def('req', () => ({
      params: {
        id: $id,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteCatalogItemEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(CatalogService, 'deleteCatalogItem').returns($response)
    })

    it('calls CatalogService.deleteCatalogItem with correct args', async () => {
      await $subject
      expect(CatalogService.deleteCatalogItem).to.have.been.calledWith($id, $user, false)
    })

    context('when CatalogService#deleteCatalogItem fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService#deleteCatalogItem succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateCatalogItemEndPoint()', () => {
    def('user', () => 'user!')
    def('id', () => 15)

    def('name', () => 'testName')
    def('description', () => 'testDescription')
    def('category', () => 'testCategory')
    def('containerImage', () => 'testContainerImage')
    def('fogTypeId', () => 'testFogTypeId')
    def('images', () => [{
      containerImage: $containerImage,
      fogTypeId: $fogTypeId,
    }])
    def('publisher', () => 'testPublisher')
    def('diskRequired', () => 15)
    def('ramRequired', () => 25)
    def('picture', () => 'testPicture')
    def('isPublic', () => false)
    def('registryId', () => 5)
    def('inputInfoType', () => 'testInfoType')
    def('inputInfoFormat', () => 'testInfoFormat')
    def('inputType', () => ({
      infoType: $inputInfoType,
      infoFormat: $inputInfoFormat,
    }))
    def('outputInfoType', () => 'testInfoType')
    def('outputInfoFormat', () => 'testInfoFormat')
    def('outputType', () => ({
      infoType: $outputInfoType,
      infoFormat: $outputInfoFormat,
    }))
    def('configExample', () => '{}')

    def('req', () => ({
      params: {
        id: $id,
      },
      body: {
        name: $name,
        description: $description,
        category: $category,
        images: $images,
        publisher: $publisher,
        diskRequired: $diskRequired,
        ramRequired: $ramRequired,
        picture: $picture,
        isPublic: $isPublic,
        registryId: $registryId,
        inputType: $inputType,
        outputType: $outputType,
        configExample: $configExample,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateCatalogItemEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(CatalogService, 'updateCatalogItem').returns($response)
    })

    it('calls CatalogService.updateCatalogItem with correct args', async () => {
      await $subject
      expect(CatalogService.updateCatalogItem).to.have.been.calledWith($id, {
        name: $name,
        description: $description,
        category: $category,
        images: $images,
        publisher: $publisher,
        diskRequired: $diskRequired,
        ramRequired: $ramRequired,
        picture: $picture,
        isPublic: $isPublic,
        registryId: $registryId,
        inputType: $inputType,
        outputType: $outputType,
        configExample: $configExample,
      }, $user, false)
    })

    context('when CatalogService.updateCatalogItem fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService.updateCatalogItem succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
