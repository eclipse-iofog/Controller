const {expect} = require('chai');
const sinon = require('sinon');

const CatalogItemManager = require('../../../src/sequelize/managers/catalog-item-manager');
const CatalogService = require('../../../src/services/catalog-service');
const Validator = require('../../../src/schemas');
const CatalogItemImageManager = require('../../../src/sequelize/managers/catalog-item-image-manager');
const CatalogItemInputTypeManager = require('../../../src/sequelize/managers/catalog-item-input-type-manager');
const CatalogItemOutputTypeManager = require('../../../src/sequelize/managers/catalog-item-output-type-manager');
const RegistryManager = require('../../../src/sequelize/managers/registry-manager');
const AppHelper = require('../../../src/helpers/app-helper');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

describe('Catalog Service', () => {
  def('subject', () => CatalogService);
  def('sandbox', () => sinon.createSandbox());

  afterEach(() => $sandbox.restore());

  describe('.createCatalogItem()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const data = {
      "name": "testName",
      "description": "string",
      "category": "string",
      "images": [
        {
          "containerImage": "x86 docker image name",
          "fogTypeId": 1
        },
        {
          "containerImage": "ARM docker image name",
          "fogTypeId": 2
        }
      ],
      "publisher": "string",
      "diskRequired": 0,
      "ramRequired": 0,
      "picture": "string",
      "isPublic": true,
      "registryId": 1,
      "inputType": {
        "infoType": "string",
        "infoFormat": "string"
      },
      "outputType": {
        "infoType": "string",
        "infoFormat": "string"
      },
      "configExample": "string"
    };

    let catalogItem = {
      name: data.name,
      description: data.description,
      category: data.category,
      configExample: data.configExample,
      publisher: data.publisher,
      diskRequired: data.diskRequired,
      ramRequired: data.ramRequired,
      picture: data.picture,
      isPublic: data.isPublic,
      registryId: data.registryId,
      userId: user.id
    };

    const catalogItemImages = [
      {
        fogTypeId: 1,
        catalogItemId: catalogItem.id
      },
      {
        fogTypeId: 2,
        catalogItemId: catalogItem.id
      }
    ];
    if (data.images) {
      for (let image of data.images) {
        switch (image.fogTypeId) {
          case 1:
            catalogItemImages[0].containerImage = image.containerImage;
            break;
          case 2:
            catalogItemImages[1].containerImage = image.containerImage;
            break;
        }
      }
    }

    let catalogItemInputType = {
      catalogItemId: catalogItem.id
    };

    if (data.inputType) {
      catalogItemInputType.infoType = data.inputType.infoType;
      catalogItemInputType.infoFormat = data.inputType.infoFormat;
    }

    let catalogItemOutputType = {
      catalogItemId: catalogItem.id
    };

    if (data.outputType) {
      catalogItemOutputType.infoType = data.outputType.infoType;
      catalogItemOutputType.infoFormat = data.outputType.infoFormat;
    }

    def('subject', () => $subject.createCatalogItem(data, user, transaction));

    def('validatorResponse', () => Promise.resolve(true));
    def('catalogItemFindResponse', () => Promise.resolve());
    def('deleteUndefinedFieldsResponse1', () => catalogItem);
    def('deleteUndefinedFieldsResponse2', () => catalogItemInputType);
    def('deleteUndefinedFieldsResponse3', () => catalogItemOutputType);
    def('catalogItemCreateResponse', () => Promise.resolve(catalogItem));
    def('catalogItemImageCreateResponse', () => Promise.resolve());
    def('catalogItemInputTypeCreateResponse', () => Promise.resolve());
    def('catalogItemOutputTypeCreateResponse', () => Promise.resolve({}));


    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(CatalogItemManager, 'findOne').returns($catalogItemFindResponse);
      $sandbox.stub(AppHelper, 'deleteUndefinedFields')
        .onFirstCall().returns($deleteUndefinedFieldsResponse1)
        .onSecondCall().returns($deleteUndefinedFieldsResponse2)
        .onThirdCall().returns($deleteUndefinedFieldsResponse3);
      $sandbox.stub(CatalogItemManager, 'create').returns($catalogItemCreateResponse);
      $sandbox.stub(CatalogItemImageManager, 'bulkCreate').returns($catalogItemImageCreateResponse);
      $sandbox.stub(CatalogItemInputTypeManager, 'create').returns($catalogItemInputTypeCreateResponse);
      $sandbox.stub(CatalogItemOutputTypeManager, 'create').returns($catalogItemOutputTypeCreateResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(data, Validator.schemas.catalogItemCreate);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls CatalogItemManager#findOne() with correct args', async () => {
        await $subject;
        const where = catalogItem.id
          ? {[Op.or]: [{userId: catalogItem.userId}, {userId: null}], name: data.name, id: {[Op.ne]: catalogItem.id}}
          : {[Op.or]: [{userId: catalogItem.userId}, {userId: null}], name: data.name};
        expect(CatalogItemManager.findOne).to.have.been.calledWith(where, transaction);
      });

      context('when CatalogItemManager#findOne() fails', () => {
        def('catalogItemFindResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      });

      context('when CatalogItemManager#findOne() succeeds', () => {
        it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
          await $subject;
          expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(catalogItem);
        });

        context('when AppHelper#deleteUndefinedFields() fails', () => {
          def('deleteUndefinedFieldsResponse1', () => error);

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.have.property('id')
          })
        });

        context('when AppHelper#deleteUndefinedFields() succeeds', () => {
          it('calls CatalogItemManager#create() with correct args', async () => {
            await $subject;
            expect(CatalogItemManager.create).to.have.been.calledWith(catalogItem, transaction);
          });

          context('when CatalogItemManager#create() fails', () => {
            def('catalogItemCreateResponse', () => Promise.reject(error));

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          });

          context('when CatalogItemManager#create() succeeds', () => {
            it('calls CatalogItemImageManager#bulkCreate() with correct args', async () => {
              await $subject;
              expect(CatalogItemImageManager.bulkCreate).to.have.been.calledWith(catalogItemImages, transaction);
            });

            context('when CatalogItemImageManager#bulkCreate() fails', () => {
              def('catalogItemImageCreateResponse', () => Promise.reject(error));

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            });

            context('when CatalogItemImageManager#bulkCreate() succeeds', () => {
              it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
                await $subject;
                expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(catalogItemInputType);
              });

              context('when AppHelper#deleteUndefinedFields() fails', () => {
                def('deleteUndefinedFieldsResponse2', () => error);

                it(`fails with ${error}`, () => {
                  return expect($subject).to.eventually.have.property('id')
                })
              });

              context('when AppHelper#deleteUndefinedFields() succeeds', () => {
                it('calls CatalogItemInputTypeManager#create() with correct args', async () => {
                  await $subject;
                  expect(CatalogItemInputTypeManager.create).to.have.been.calledWith(catalogItemInputType);
                });

                context('when CatalogItemInputTypeManager#create() fails', () => {
                  def('catalogItemInputTypeCreateResponse', () => Promise.reject(error));

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                });

                context('when CatalogItemInputTypeManager#create() succeeds', () => {
                  it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
                    await $subject;
                    expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(catalogItemOutputType);
                  });

                  context('when AppHelper#deleteUndefinedFields() fails', () => {
                    def('deleteUndefinedFieldsResponse3', () => error);

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.eventually.have.property('id')
                    })
                  });

                  context('when AppHelper#deleteUndefinedFields() succeeds', () => {
                    it('calls CatalogItemOutputTypeManager#create() with correct args', async () => {
                      await $subject;
                      expect(CatalogItemOutputTypeManager.create).to.have.been.calledWith(catalogItemOutputType);
                    });

                    context('when CatalogItemOutputTypeManager#create() fails', () => {
                      def('catalogItemOutputTypeCreateResponse', () => Promise.reject(error));

                      it(`fails with ${error}`, () => {
                        return expect($subject).to.be.rejectedWith(error)
                      })
                    });

                    context('when CatalogItemOutputTypeManager#create() succeeds', () => {
                      it('succeeds', () => {
                        return expect($subject).to.eventually.have.property('id')
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  });

  describe('.updateCatalogItem()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const id = 25;

    const data = {
      "name": "string",
      "description": "string",
      "category": "string",
      "images": [
        {
          "containerImage": "x86 docker image name",
          "fogTypeId": 1
        },
        {
          "containerImage": "ARM docker image name",
          "fogTypeId": 2
        }
      ],
      "publisher": "string",
      "diskRequired": 0,
      "ramRequired": 0,
      "picture": "string",
      "isPublic": true,
      "registryId": 1,
      "inputType": {
        "infoType": "string",
        "infoFormat": "string"
      },
      "outputType": {
        "infoType": "string",
        "infoFormat": "string"
      },
      "configExample": "string"
    };

    const isCLI = false;
    const where = isCLI
      ? {id: id}
      : {id: id, userId: user.id};

    data.id = id;


    let catalogItem = {
      name: data.name,
      description: data.description,
      category: data.category,
      configExample: data.configExample,
      publisher: data.publisher,
      diskRequired: data.diskRequired,
      ramRequired: data.ramRequired,
      picture: data.picture,
      isPublic: data.isPublic,
      registryId: data.registryId
    };

    const image1 = {
      fogTypeId: 1,
      catalogItemId: id
    };
    const image2 = {
      fogTypeId: 2,
      catalogItemId: id
    };
    const catalogItemImages = [
      image1, image2
    ];

    if (data.images) {
      for (let image of data.images) {
        switch (image.fogTypeId) {
          case 1:
            catalogItemImages[0].containerImage = image.containerImage;
            break;
          case 2:
            catalogItemImages[1].containerImage = image.containerImage;
            break;
        }
      }
    }

    const updatedImage1 = {
      fogTypeId: 1,
      containerImage: "x86 docker image name",
    };

    const updatedImage2 = {
      fogTypeId: 2,
      containerImage: "ARM docker image name",
    };

    let catalogItemInputType = {
      catalogItemId: id
    };

    if (data.inputType) {
      catalogItemInputType.infoType = data.inputType.infoType;
      catalogItemInputType.infoFormat = data.inputType.infoFormat;
    }

    let catalogItemOutputType = {
      catalogItemId: id
    };

    if (data.outputType) {
      catalogItemOutputType.infoType = data.outputType.infoType;
      catalogItemOutputType.infoFormat = data.outputType.infoFormat;
    }

    def('subject', () => $subject.updateCatalogItem(id, data, user, isCLI, transaction));

    def('validatorResponse', () => Promise.resolve(true));
    def('deleteUndefinedFieldsResponse1', () => catalogItem);
    def('deleteUndefinedFieldsResponse2', () => catalogItemInputType);
    def('deleteUndefinedFieldsResponse3', () => catalogItemOutputType);
    def('isEmptyResponse', () => false);
    def('registryFindResponse', () => Promise.resolve({}));
    def('catalogItemFindResponse1', () => Promise.resolve(catalogItem));
    def('catalogItemFindResponse2', () => Promise.resolve());
    def('catalogItemUpdateResponse', () => Promise.resolve());
    def('catalogItemImageUpdateOrCreateResponse', () => Promise.resolve());
    def('catalogItemInputTypeUpdateOrCreateResponse', () => Promise.resolve());
    def('catalogItemOutputTypeUpdateOrCreateResponse', () => Promise.resolve({}));


    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(AppHelper, 'deleteUndefinedFields')
        .onFirstCall().returns($deleteUndefinedFieldsResponse1)
        .onSecondCall().returns($deleteUndefinedFieldsResponse2)
        .onThirdCall().returns($deleteUndefinedFieldsResponse3);
      $sandbox.stub(AppHelper, 'isEmpty').returns($isEmptyResponse);
      $sandbox.stub(RegistryManager, 'findOne').returns($registryFindResponse);
      $sandbox.stub(CatalogItemManager, 'findOne')
        .onCall(0).returns($catalogItemFindResponse1)
        .onCall(1).returns($catalogItemFindResponse2)
        .onCall(2).returns($catalogItemFindResponse1)
        .onCall(3).returns($catalogItemFindResponse2);
      $sandbox.stub(CatalogItemManager, 'update').returns($catalogItemUpdateResponse);
      $sandbox.stub(CatalogItemImageManager, 'updateOrCreate').returns($catalogItemImageUpdateOrCreateResponse); // twice
      $sandbox.stub(CatalogItemInputTypeManager, 'updateOrCreate').returns($catalogItemInputTypeUpdateOrCreateResponse);
      $sandbox.stub(CatalogItemOutputTypeManager, 'updateOrCreate').returns($catalogItemOutputTypeUpdateOrCreateResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(data, Validator.schemas.catalogItemUpdate);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
        await $subject;
        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(catalogItem);
      });

      context('when AppHelper#deleteUndefinedFields() fails', () => {
        def('deleteUndefinedFieldsResponse1', () => error);

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      });

      context('when AppHelper#deleteUndefinedFields() succeeds', () => {
        it('calls AppHelper#isEmpty() with correct args', async () => {
          await $subject;
          expect(AppHelper.isEmpty).to.have.been.calledWith(catalogItem);
        });

        context('when AppHelper#isEmpty() fails', () => {
          def('isEmptyResponse', () => error);

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        });

        context('when AppHelper#isEmpty() succeeds', () => {
          it('calls RegistryManager#findOne() with correct args', async () => {
            await $subject;
            expect(RegistryManager.findOne).to.have.been.calledWith({
              id: data.registryId
            }, transaction)
          });

          context('when RegistryManager#findOne() fails', () => {
            def('registryFindResponse', () => Promise.reject(error));

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          });

          context('when RegistryManager#findOne() succeeds', () => {
            it('calls CatalogItemManager#findOne() with correct args', async () => {
              await $subject;
              const whereFind = catalogItem.id
                ? {
                  [Op.or]: [{userId: catalogItem.userId}, {userId: null}],
                  name: data.name,
                  id: {[Op.ne]: catalogItem.id}
                }
                : {[Op.or]: [{userId: catalogItem.userId}, {userId: null}], name: data.name};
              expect(CatalogItemManager.findOne).to.have.been.calledWith(whereFind, transaction);
            });

            context('when CatalogItemManager#findOne() succeeds', () => {
              it('calls CatalogItemManager#findOne() with correct args', async () => {
                await $subject;
                const whereFind = catalogItem.id
                  ? {
                    [Op.or]: [{userId: catalogItem.userId}, {userId: null}],
                    name: data.name,
                    id: {[Op.ne]: catalogItem.id}
                  }
                  : {[Op.or]: [{userId: catalogItem.userId}, {userId: null}], name: data.name};
                expect(CatalogItemManager.findOne).to.have.been.calledWith(whereFind, transaction);
              });

              context('when CatalogItemManager#findOne() succeeds', () => {
                it('calls CatalogItemManager#update() with correct args', async () => {
                  await $subject;
                  expect(CatalogItemManager.update).to.have.been.calledWith(where, catalogItem, transaction);
                });

                context('when CatalogItemManager#update() fails', () => {
                  def('catalogItemUpdateResponse', () => Promise.reject(error));

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                });

                context('when CatalogItemManager#update() succeeds', () => {
                  it('calls CatalogItemImageManager#updateOrCreate() with correct args', async () => {
                    await $subject;
                    expect(CatalogItemImageManager.updateOrCreate).to.have.been.calledWith({
                      catalogItemId: data.id,
                      fogTypeId: image1.fogTypeId
                    }, updatedImage1, transaction);
                  });

                  context('when CatalogItemImageManager#updateOrCreate() fails', () => {
                    def('catalogItemImageUpdateOrCreateResponse', () => error);

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.eventually.equal(undefined)
                    })
                  });

                  context('when CatalogItemImageManager#updateOrCreate() succeeds', () => {
                    it('calls CatalogItemImageManager#updateOrCreate() with correct args', async () => {
                      await $subject;
                      expect(CatalogItemImageManager.updateOrCreate).to.have.been.calledWith({
                        catalogItemId: id,
                        fogTypeId: image2.fogTypeId
                      }, updatedImage2, transaction);
                    });

                    context('when CatalogItemImageManager#updateOrCreate() fails', () => {
                      def('catalogItemImageUpdateOrCreateResponse', () => Promise.reject(error));

                      it(`fails with ${error}`, () => {
                        return expect($subject).to.be.rejectedWith(error)
                      })
                    });

                    context('when CatalogItemImageManager#updateOrCreate() succeeds', () => {
                      it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
                        await $subject;
                        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(catalogItemInputType);
                      });

                      context('when AppHelper#deleteUndefinedFields() fails', () => {
                        def('deleteUndefinedFieldsResponse2', () => error);

                        it(`fails with ${error}`, () => {
                          return expect($subject).to.eventually.equal(undefined)
                        })
                      });

                      context('when AppHelper#deleteUndefinedFields() succeeds', () => {
                        it('calls CatalogItemInputTypeManager#updateOrCreate() with correct args', async () => {
                          await $subject;
                          expect(CatalogItemInputTypeManager.updateOrCreate).to.have.been.calledWith({
                            catalogItemId: data.id
                          }, catalogItemInputType, transaction);
                        });

                        context('when CatalogItemInputTypeManager#updateOrCreate() fails', () => {
                          def('catalogItemInputTypeUpdateOrCreateResponse', () => Promise.reject(error));

                          it(`fails with ${error}`, () => {
                            return expect($subject).to.be.rejectedWith(error)
                          })
                        });

                        context('when CatalogItemInputTypeManager#updateOrCreate() succeeds', () => {
                          it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
                            await $subject;
                            expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(catalogItemOutputType);
                          });

                          context('when AppHelper#deleteUndefinedFields() fails', () => {
                            def('deleteUndefinedFieldsResponse3', () => error);

                            it(`fails with ${error}`, () => {
                              return expect($subject).to.eventually.equal(undefined)
                            })
                          });

                          context('when AppHelper#deleteUndefinedFields() succeeds', () => {
                            it('calls CatalogItemOutputTypeManager#updateOrCreate() with correct args', async () => {
                              await $subject;
                              expect(CatalogItemOutputTypeManager.updateOrCreate).to.have.been.calledWith({
                                catalogItemId: data.id
                              }, catalogItemOutputType, transaction);
                            });

                            context('when CatalogItemOutputTypeManager#updateOrCreate() fails', () => {
                              def('catalogItemOutputTypeUpdateOrCreateResponse', () => Promise.reject(error));

                              it(`fails with ${error}`, () => {
                                return expect($subject).to.be.rejectedWith(error)
                              })
                            });

                            context('when CatalogItemOutputTypeManager#updateOrCreate() succeeds', () => {
                              it('succeeds', () => {
                                return expect($subject).to.eventually.equal(undefined)
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  });

  describe('.listCatalogItems()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const isCLI = false;

    const where = isCLI
      ? {category: {[Op.ne]: 'SYSTEM'}}
      : {[Op.or]: [{userId: user.id}, {userId: null}], category: {[Op.ne]: 'SYSTEM'}};

    const attributes = isCLI
      ? {}
      : {exclude: ["userId"]};

    def('subject', () => $subject.listCatalogItems(user, isCLI, transaction));

    def('catalogItemsFindResponse', () => Promise.resolve());

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findAllWithDependencies').returns($catalogItemFindResponse);
    });

    it('calls CatalogItemManager#findAllWithDependencies() with correct args', async () => {
      await $subject;
      expect(CatalogItemManager.findAllWithDependencies).to.have.been.calledWith(where, attributes, transaction);
    });

    context('when CatalogItemManager#findAllWithDependencies() fails', () => {
      def('catalogItemsFindResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.eventually.have.property('catalogItems');
      })
    });

    context('when CatalogItemManager#findAllWithDependencies() succeeds', () => {
      it('succeeds', () => {
        return expect($subject).to.eventually.have.property('catalogItems')
      })
    })

  });

  describe('.getCatalogItem()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const isCLI = false;

    const id = 5;

    const where = isCLI
      ? {id: id, category: {[Op.ne]: 'SYSTEM'}}
      : {[Op.or]: [{userId: user.id}, {userId: null}], id: id, category: {[Op.ne]: 'SYSTEM'}};

    const attributes = isCLI
      ? {}
      : {exclude: ["userId"]};

    def('subject', () => $subject.getCatalogItem(id, user, isCLI, transaction));

    def('catalogItemFindResponse', () => Promise.resolve({}));

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findOneWithDependencies').returns($catalogItemFindResponse);
    });

    it('calls CatalogItemManager#findOneWithDependencies() with correct args', async () => {
      await $subject;
      expect(CatalogItemManager.findOneWithDependencies).to.have.been.calledWith(where, attributes, transaction);
    });

    context('when CatalogItemManager#findOneWithDependencies() fails', () => {
      def('catalogItemFindResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when CatalogItemManager#findOneWithDependencies() succeeds', () => {
      it('succeeds', () => {
        return expect($subject).to.eventually.deep.equal({})
      })
    })

  });

  describe('.deleteCatalogItem()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const isCLI = false;

    const id = 5;

    const where = isCLI
      ? {id: id}
      : {userId: user.id, id: id};

    def('subject', () => $subject.deleteCatalogItem(id, user, isCLI, transaction));

    def('response', () => 1);
    def('catalogItemDeleteResponse', () => Promise.resolve($response));

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'delete').returns($catalogItemDeleteResponse);
    });

    it('calls CatalogItemManager#delete() with correct args', async () => {
      await $subject;
      expect(CatalogItemManager.delete).to.have.been.calledWith(where, transaction);
    });

    context('when CatalogItemManager#delete() fails', () => {
      def('catalogItemDeleteResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when CatalogItemManager#delete() succeeds', () => {
      it('succeeds', () => {
        return expect($subject).to.eventually.deep.equal($response)
      })
    })

  });

  describe('.getNetworkCatalogItem()', () => {
    const transaction = {};
    const error = 'Error!';

    def('subject', () => $subject.getNetworkCatalogItem(transaction));

    def('response', () => 1);
    def('catalogItemFindResponse', () => Promise.resolve($response));

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findOne').returns($catalogItemFindResponse);
    });

    it('calls CatalogItemManager#findOne() with correct args', async () => {
      await $subject;
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: 'Networking Tool',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        registry_id: 1,
        user_id: null
      }, transaction);
    });

    context('when CatalogItemManager#findOne() fails', () => {
      def('catalogItemFindResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when CatalogItemManager#findOne() succeeds', () => {
      it('succeeds', () => {
        return expect($subject).to.eventually.deep.equal($response)
      })
    })

  });

  describe('.getBluetoothCatalogItem()', () => {
    const transaction = {};
    const error = 'Error!';

    def('subject', () => $subject.getBluetoothCatalogItem(transaction));

    def('response', () => 1);
    def('catalogItemFindResponse', () => Promise.resolve($response));

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findOne').returns($catalogItemFindResponse);
    });

    it('calls CatalogItemManager#findOne() with correct args', async () => {
      await $subject;
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: 'RESTBlue',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        registry_id: 1,
        user_id: null
      }, transaction);
    });

    context('when CatalogItemManager#findOne() fails', () => {
      def('catalogItemFindResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when CatalogItemManager#findOne() succeeds', () => {
      it('succeeds', () => {
        return expect($subject).to.eventually.deep.equal($response)
      })
    })

  });

  describe('.getHalCatalogItem()', () => {
    const transaction = {};
    const error = 'Error!';

    def('subject', () => $subject.getHalCatalogItem(transaction));

    def('response', () => 1);
    def('catalogItemFindResponse', () => Promise.resolve($response));

    beforeEach(() => {
      $sandbox.stub(CatalogItemManager, 'findOne').returns($catalogItemFindResponse);
    });

    it('calls CatalogItemManager#findOne() with correct args', async () => {
      await $subject;
      expect(CatalogItemManager.findOne).to.have.been.calledWith({
        name: 'HAL',
        category: 'SYSTEM',
        publisher: 'Eclipse ioFog',
        registry_id: 1,
        user_id: null
      }, transaction);
    });

    context('when CatalogItemManager#findOne() fails', () => {
      def('catalogItemFindResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when CatalogItemManager#findOne() succeeds', () => {
      it('succeeds', () => {
        return expect($subject).to.eventually.deep.equal($response)
      })
    })

  });

});