import { EventEmitter } from 'events';
import {
    amqpURL, amqpOptions, queuePrefix, prefetchCount
} from 'config';
import amqp from 'amqp-connection-manager';

import { IAmqpConnectionManager } from 'amqp-connection-manager/dist/esm/AmqpConnectionManager';
import loggerRaw from '../../../lib/logger';

const logger = loggerRaw('MQ');

async function subscriptionBind(queueName, handler, exchange, routingKey) {
    const channel = await this.openChannel(queueName);
    const queueNameReal = `${queuePrefix}${queueName}`;

    if (exchange && routingKey) {
        await channel.bindQueue(queueNameReal, exchange, routingKey);
    }

    const { consumerTag } = await channel.consume(queueNameReal, async message => {
        if (message !== null) {
            this.messagesInProcess += 1;

            const content = JSON.parse(message.content.toString());

            logger.debug(`consume event {${routingKey || content.type}} in queue [${queueName}] %j`, content);

            await Promise.resolve(handler(
                content,
                {
                    ack: () => channel.ack(message),
                    nack: (allUpTo, requeue) => channel.nack(message, allUpTo, requeue)
                },
                message.properties
            ));

            this.messagesInProcess -= 1;

            if (this.messagesInProcess === 0) {
                this.emit('service-done');
            }
        }
    }, { prefetch: prefetchCount });

    if (!this.consumers[queueName]) {
        this.consumers[queueName] = [];
    }

    this.consumers[queueName].push(consumerTag);

    logger.info('consumer start %j', {
        exchange: exchange || null,
        queueName,
        routingKey,
        tag: consumerTag
    });
}

async function publishMsg(queueName, msg, exchange, type) {
    const channel = await this.openChannel(queueName);

    const json = JSON.stringify(msg);

    logger.debug(`publish event {${type}} in queue [${queueName}] %j`, (json.length <= 2048)
        ? json
        : `${json.substring(0, 2048)}...`);

    const queueNameReal = `${queuePrefix}${queueName}`;

    channel.publish(
        exchange,
        queueNameReal,
        msg,
        {
            contentType: 'application/json',
            headers: { content_type: 'application/json' }
        }
    );
}

class RabbitMQHandler extends EventEmitter {
    private url: string;

    private options: any;

    private messagesInProcess: number;

    private connection: any;

    private channels: any;

    private consumers: any;

    private subscribers: any[];

    private buffer: any[];

    private status: string;

    private isReportSended: boolean;

    constructor(url, options) {
        super();

        this.url = url;
        this.options = options;

        this.messagesInProcess = 0;
        this.connection = null;

        this.channels = {};
        this.consumers = {};
        this.subscribers = [];
        this.buffer = [];

        this.status = 'offline';

        this.isReportSended = false;
    }

    async openChannel(queueName) {
        if (!this.channels[queueName]) {
            const queueNameReal = `${queuePrefix}${queueName}`;

            const channel = this.connection.createChannel({
                json: true,
                setup: channelData => channelData.assertQueue(queueNameReal, { durable: true, exclusive: false })
            });

            this.channels[queueName] = channel;
        }

        return this.channels[queueName];
    }

    async connect() {
        if (!this.connection) {
            return new Promise((resolve, reject) => {
                try {
                    this.status = 'connecting';

                    this.connection = amqp.connect([this.url], {
                        reconnectTimeInSeconds: 2,
                        connectionOptions: { noDelay: true }
                    });

                    this.connection.on('connect', async () => {
                        const queueList = Object.keys(this.channels);
                        const buffer = [...this.buffer];

                        this.buffer = [];
                        this.channels = {};
                        this.consumers = {};

                        await Promise.all(queueList.map(queueName => this.openChannel(queueName)));

                        await Promise.all(this.subscribers.map(args => subscriptionBind.call(this, ...args)));
                        await Promise.all(buffer.map(({ queueName, msg, exchange }) => (
                            publishMsg.call(this, queueName, msg, exchange)
                        )));

                        this.status = 'online';
                        this.isReportSended = false;

                        logger.info('RabbitMQ connected');

                        resolve(true);
                    });

                    this.connection.on('connectFailed', async error => {
                        this.status = 'connecting';

                        if (!this.isReportSended) {
                            logger.error('RabbitMQ connect failed: %s', error);
                            this.isReportSended = true;
                        }
                    });

                    this.connection.on('disconnect', async () => {
                        this.status = 'connecting';

                        if (!this.isReportSended) {
                            logger.error('RabbitMQ disconnected');

                            this.isReportSended = true;
                        }
                    });
                } catch (error) {
                    if (!this.isReportSended) {
                        logger.error('RabbitMQ connection error: %s', error);

                        this.isReportSended = true;
                    }
                }
            });
        }

        this.isReportSended = false;

        return true;
    }

    /**
     *
     * @param queueName
     * @param type
     * @param data
     * @param additionalFields
     * @param exchange
     * @returns {Promise<null|*>}
     */
    async publish(queueName, type, data, additionalFields = {}, exchange?: string) {
        const msg = { ...additionalFields, data, type };

        if (this.status === 'online') {
            return publishMsg.call(this, queueName, msg, exchange, type);
        }

        this.buffer.push({ queueName, msg, exchange });

        return null;
    }

    /**
     *
     * @param queueName
     * @param handler
     * @param exchange
     * @param routingKey
     * @returns {Promise<void>}
     */
    async subscribe(queueName, handler, exchange, routingKey) {
        this.subscribers.push([queueName, handler, exchange, routingKey]);

        return subscriptionBind.call(this, queueName, handler, exchange, routingKey);
    }

    async close() {
        if (this.connection) {
            await (<IAmqpConnectionManager> this.connection).close();
        }
    }
}

type TRabbitMqHandler = RabbitMQHandler;
export { RabbitMQHandler, TRabbitMqHandler };
export default new RabbitMQHandler(amqpURL, amqpOptions);
