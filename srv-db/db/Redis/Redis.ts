import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { redis } from 'config';

import loggerRaw from '../../../lib/logger';
import { cloneDeep } from '../../../lib/utils/fn';

const logger = loggerRaw('REDIS');

const connector = () => (process.env.NODE_ENV !== 'test' ? Redis : RedisMock);
const connections = new Set();

class SmartyRedis extends connector() {
    private messagesInProcess: number;

    public isReportSended: boolean;

    constructor(...args) {
        // @ts-ignore
        super(...args);

        this.messagesInProcess = 0;

        connections.add(this);

        this.isReportSended = false;
    }

    static async graceful() {
        logger.info('closing connections');
        const promises = [];

        for (const connection of connections) {
            promises.push((<SmartyRedis> connection).shutdown());
        }
        await Promise.all(promises);
        logger.info('all connections closed');
    }

    duplicate(override = {}) {
        return new SmartyRedis({ ...cloneDeep(this.options), ...override });
    }

    clearListeners(event) {
        if (this.listenerCount(event) > 0) {
            for (const handler of this.listeners(event)) {
                // @ts-ignore
                this.off(event, handler);
            }
        }
    }

    async shutdown(): Promise<'OK'> {
        this.clearListeners('message');
        this.clearListeners('pmessage');

        if (this.messagesInProcess > 0) {
            // eslint-disable-next-line no-promise-executor-return
            await new Promise(resolve => this.once('service-done', resolve));
        }

        this.disconnect();

        return 'OK';
    }

    on(event, handler) {
        if (event === 'message' || event === 'pmessage') {
            const inner = async (...args) => {
                this.messagesInProcess += 1;

                await Promise.resolve(handler(...args));

                this.messagesInProcess -= 1;

                if (this.messagesInProcess === 0) {
                    this.emit('service-done');
                }
            };

            super.on(event, inner);
        } else {
            super.on(event, handler);
        }

        return this;
    }
}

const redisClient = new SmartyRedis({
    ...redis,
    reconnectOnError(e) {
        logger.error(e, 'connection error');

        return true;
    }
});

redisClient.on('error', async e => {
    if (!redisClient.isReportSended) {
        redisClient.isReportSended = true;
    }
});

redisClient.on('ready', async () => {
    if (redisClient.isReportSended) {
        redisClient.isReportSended = false;
    }

    logger.info('Redis connected');
});

const redisInit = async () => {
    return new Promise(resolve => {
        redisClient.once('error', async error => {
            logger.error(error);
            resolve(false);
        });

        redisClient.once('ready', () => {
            resolve(true);
        });
    });
};

export { redisClient, redisInit };
