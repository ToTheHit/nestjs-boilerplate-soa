import { logger } from 'config';
import pino from 'pino';
import pretty from 'pino-pretty';

const stream = pretty({
    colorize: true,
    sync: true,
    customPrettifiers: {
        time: timestamp => null
    }
});

export default labelValue => {
    const loggerConfig = {
        level: logger.level,
        name: labelValue
    };

    return pino(loggerConfig, stream);
};
