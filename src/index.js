const config = require('@brickblock/strong-config').load()
const logger = require('bunyan').createLogger(config.logger)
const { connect, deploy, watch } = require('./kubernetes')
const start = async () => {
  logger.info('Initializing Ganache controller...')
  await connect()
  await deploy()
  await watch()
}

start()
