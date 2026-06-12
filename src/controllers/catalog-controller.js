const CatalogService = require('../services/catalog-service')

const createCatalogItemEndPoint = async function (req) {
  return CatalogService.createCatalogItemEndPoint(req.body)
}

const listCatalogItemsEndPoint = async function (req) {
  return CatalogService.listCatalogItemsEndPoint(false)
}

const listCatalogItemEndPoint = async function (req) {
  return CatalogService.getCatalogItemEndPoint(req.params.id, false)
}

const deleteCatalogItemEndPoint = async function (req) {
  await CatalogService.deleteCatalogItemEndPoint(req.params.id, false)
}

const updateCatalogItemEndPoint = async function (req) {
  await CatalogService.updateCatalogItemEndPoint(req.params.id, req.body, false)
}

module.exports = {
  createCatalogItemEndPoint,
  listCatalogItemsEndPoint,
  listCatalogItemEndPoint,
  deleteCatalogItemEndPoint,
  updateCatalogItemEndPoint
}
