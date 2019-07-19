const handlebars = require('handlebars')
const fs = require('fs-extra')
const yaml = require('js-yaml')
const config = require('@brickblock/strong-config').load()
const logger = require('bunyan').createLogger({
  ...config.logger,
  name: 'kubernetes',
})
const apply = async (item, template, api, destroy) => {
  const source = await fs.readFile(
    `${__dirname}/templates/${template}.yml`,
    'utf8'
  )
  const rendered = handlebars.compile(source)(item)
  const body = yaml.load(rendered)

  if (!destroy) {
    try {
      await api.post({ body })
      logger.info(
        `Created ${template} ${item.metadata.name} in namespace ${item.metadata.namespace}`
      )
    } catch (error) {
      if (error.code !== 409) {
        logger.error(error.message)
      }

      await api(item.metadata.name)
        .put({ body })
        .then(() =>
          logger.info(
            `Updated ${template} ${item.metadata.name} in namespace ${item.metadata.namespace}`
          )
        )
        .catch(err => logger.error(err.message))
    }
  } else {
    await api(item.metadata.name)
      .delete()
      .catch(error => logger.error(error.message))
    logger.info(
      `Deleted  ${template} ${item.metadata.name} in namespace ${item.metadata.namespace}`
    )
  }
}
const create = async (item, client) => {
  await apply(
    item,
    'deployment',
    client.apis.apps.v1.namespaces(item.metadata.namespace).deployments
  )
  await apply(
    item,
    'service',
    client.api.v1.namespaces(item.metadata.namespace).services
  )
  await apply(
    item,
    'ingress',
    client.apis.extensions.v1beta1.namespaces(item.metadata.namespace).ingresses
  )
}

const destroy = async (item, client) => {
  await apply(
    item,
    'deployment',
    client.apis.apps.v1.namespaces(item.metadata.namespace).deployments,
    true
  )
  await apply(
    item,
    'service',
    client.api.v1.namespaces(item.metadata.namespace).services,
    true
  )
  await apply(
    item,
    'ingress',
    client.apis.extensions.v1beta1.namespaces(item.metadata.namespace)
      .ingresses,
    true
  )
}

module.exports = { create, destroy }
