const { expect } = require('chai')
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
      $sandbox.stub(CatalogService, 'createCatalogItemEndPoint').returns($response)
    })

    it('calls CatalogService.createCatalogItemEndPoint with correct args', async () => {
      await $subject
      expect(CatalogService.createCatalogItemEndPoint).to.have.been.calledWith({
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

    context('when CatalogService#createCatalogItemEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService#createCatalogItemEndPoint succeeds', () => {
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
      $sandbox.stub(CatalogService, 'listCatalogItemsEndPoint').returns($response)
    })

    it('calls CatalogService.listCatalogItemsEndPoint with correct args', async () => {
      await $subject
      expect(CatalogService.listCatalogItemsEndPoint).to.have.been.calledWith($user, false)
    })

    context('when CatalogService#listCatalogItemsEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService#listCatalogItemsEndPoint succeeds', () => {
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
      $sandbox.stub(CatalogService, 'getCatalogItemEndPoint').returns($response)
    })

    it('calls CatalogService.getCatalogItemEndPoint with correct args', async () => {
      await $subject
      expect(CatalogService.getCatalogItemEndPoint).to.have.been.calledWith($id, $user, false)
    })

    context('when CatalogService#getCatalogItemEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService#getCatalogItemEndPoint succeeds', () => {
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
      $sandbox.stub(CatalogService, 'deleteCatalogItemEndPoint').returns($response)
    })

    it('calls CatalogService.deleteCatalogItemEndPoint with correct args', async () => {
      await $subject
      expect(CatalogService.deleteCatalogItemEndPoint).to.have.been.calledWith($id, $user, false)
    })

    context('when CatalogService#deleteCatalogItemEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService#deleteCatalogItemEndPoint succeeds', () => {
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
      $sandbox.stub(CatalogService, 'updateCatalogItemEndPoint').returns($response)
    })

    it('calls CatalogService.updateCatalogItemEndPoint with correct args', async () => {
      await $subject
      expect(CatalogService.updateCatalogItemEndPoint).to.have.been.calledWith($id, {
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

    context('when CatalogService.updateCatalogItemEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when CatalogService.updateCatalogItemEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
