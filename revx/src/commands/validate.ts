import { ConfigLoader } from '../utils/config.js';
import { Logger } from '../utils/logger.js';

export async function validateCommand(configFile: string, options: { verbose?: boolean }) {
  const logger = new Logger(options.verbose);
  const configLoader = new ConfigLoader(logger);

  try {
    logger.info(`Validating configuration file: ${configFile}`);

    const config = configLoader.load(configFile);

    logger.success('Configuration is valid');
    logger.info('');
    logger.info('Configuration summary:');
    logger.info(`  Server: ${config.server.host || '0.0.0.0'}:${config.server.port}`);
    logger.info(`  Routes: ${config.routes.length}`);

    if (options.verbose) {
      logger.info('');
      logger.info('Route details:');
      config.routes.forEach((route, index) => {
        logger.info(`  ${index + 1}. ${route.path}`);
        if (route.target) {
          logger.info(`     Target: ${route.target}`);
          if (route.ws) {
            logger.info(`     WebSocket: enabled`);
          }
        } else if (route.static) {
          logger.info(`     Static: ${route.static}`);
        }
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Validation failed: ${error.message}`);
    }
    process.exit(1);
  }
}
