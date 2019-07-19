const config = require('@brickblock/strong-config').load()
const JsonStream = require('json-stream')
const fs = require('fs-extra')
const yaml = require('js-yaml')
const { Client } = require('kubernetes-client')
const { create, destroy } = require('./ganache')
const logger = require('bunyan').createLogger({
  ...config.logger,
  name: 'kubernetes',
})
const client = new Client()

const deploy = async () => {
  const crdDir = `${__dirname}/../crd`
  const files = await fs.readdir(crdDir)
  const crds = await client.apis[
    'apiextensions.k8s.io'
  ].v1beta1.customresourcedefinitions.get()
  const crdNames = crds.body.items.map(c => c.metadata.name)
  const crdMetas = crds.body.items

  for (const file of files) {
    const manifest = await fs.readFile(`${crdDir}/${file}`, 'utf8')
    const crd = yaml.load(manifest)
    const exists = crdNames.includes(crd.metadata.name)

    if (!exists) {
      logger.info(`Deploying ${crd.metadata.name}...`)
      await client.apis[
        'apiextensions.k8s.io'
      ].v1beta1.customresourcedefinitions.post({
        body: crd,
      })
      logger.info(`Deployed ${crd.metadata.name}...`)
    } else {
      logger.info(`Updating ${crd.metadata.name}...`)
      const oldCrd = crdMetas.find(
        crdMeta => crdMeta.metadata.name === crd.metadata.name
      )
      const merged = { ...crd, ...oldCrd }
      await client.apis['apiextensions.k8s.io'].v1beta1
        .customresourcedefinitions(crd.metadata.name)
        .put({
          body: merged,
        })
      logger.info(`Updated ${crd.metadata.name}...`)
    }

    client.addCustomResourceDefinition(crd)
  }
}

const connect = async () => {
  logger.info(`Loading Kubernetes specifications...`)
  await client.loadSpec()
  const namespaces = await client.api.v1.namespaces.get()
  logger.info(`Watching ${namespaces.body.items.length} namespaces`)
}

const watch = async () => {
  logger.info('Watching for events...')
  const stream = await client.apis[
    'brickblock.io'
  ].v1alpha1.watch.ganaches.getStream()
  const jsonStream = new JsonStream()
  stream.pipe(jsonStream)
  jsonStream.on('end', async () => {
    await watch()
  })
  jsonStream.on('data', async event => {
    logger.info(
      `${event.type}: ${event.object.metadata.namespace}/${event.object.metadata.name}`
    )

    switch (event.type) {
      case 'ADDED':
        await create(event.object, client)
        break
      case 'DELETED':
        await destroy(event.object, client)
        break
      default:
        break
    }
  })
}

module.exports = { connect, watch, deploy }
