const Errors = require('./errors')
const AppHelper = require('./app-helper')
const ErrorMessages = require('./error-messages')

const DEPLOY_ARCH_IDS = [1, 2, 3, 4]

function validateUniqueArchIds (images) {
  if (!images || !images.length) {
    return
  }
  const seen = new Set()
  for (const image of images) {
    if (image.archId == null) {
      continue
    }
    if (seen.has(image.archId)) {
      throw new Errors.ValidationError(`Duplicate archId '${image.archId}' in images`)
    }
    seen.add(image.archId)
  }
}

function validateImageMatchesFogArch (microserviceName, fog, images) {
  if (!images || !images.length) {
    return
  }
  let found = false
  for (const image of images) {
    if (image.archId === fog.archId && image.containerImage) {
      found = true
      break
    }
  }
  if (!found) {
    throw new Errors.ValidationError(
      AppHelper.formatMessage(ErrorMessages.MISSING_IMAGE, microserviceName)
    )
  }
}

function validateImagesAgainstCatalog (catalogItem, images) {
  const allImagesEmpty = images.reduce((result, b) => result && b.containerImage === '', true)
  if (allImagesEmpty) {
    return
  }
  for (const img of images) {
    let found = false
    for (const catalogImg of catalogItem.images) {
      if (catalogImg.archId === img.archId) {
        found = true
      }
      if (found === true && img.containerImage !== '' && catalogImg.containerImage !== img.containerImage) {
        throw new Errors.ValidationError(
          AppHelper.formatMessage(ErrorMessages.CATALOG_NOT_MATCH_IMAGES, `${catalogItem.id}`)
        )
      }
    }
    if (!found) {
      throw new Errors.ValidationError(
        AppHelper.formatMessage(ErrorMessages.CATALOG_NOT_MATCH_IMAGES, `${catalogItem.id}`)
      )
    }
  }
}

function imagesAreEqual (leftImages, rightImages) {
  const normalize = (images) => images
    .map((image) => ({ archId: image.archId, containerImage: image.containerImage }))
    .sort((a, b) => a.archId - b.archId)

  const left = normalize(leftImages)
  const right = normalize(rightImages)
  if (left.length !== right.length) {
    return false
  }
  return left.every((image, index) => {
    const other = right[index]
    return image.archId === other.archId && image.containerImage === other.containerImage
  })
}

function mapYamlImagesToArchList (images) {
  const imgs = []
  if (!images || typeof images !== 'object') {
    return imgs
  }
  const yamlKeyToArchId = [
    ['amd64', 1],
    ['x86', 1],
    ['arm64', 2],
    ['riscv64', 3],
    ['riscv', 3],
    ['arm', 4]
  ]
  for (const [key, archId] of yamlKeyToArchId) {
    if (images[key] != null) {
      imgs.push({
        archId,
        containerImage: images[key]
      })
    }
  }
  return imgs
}

module.exports = {
  DEPLOY_ARCH_IDS,
  validateUniqueArchIds,
  validateImageMatchesFogArch,
  validateImagesAgainstCatalog,
  imagesAreEqual,
  mapYamlImagesToArchList
}
