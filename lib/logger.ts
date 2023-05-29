import { logger } from 'config';
import pino from 'pino';
import pretty from 'pino-pretty';

const stream = pretty({
    // TODO: вернуть прошлую версию перед переездном на кубер (если он будет, лол).
    //  Сейчас оставил так для удобства дебага на проде
    //  process.env.NODE_ENV !== 'production'
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
