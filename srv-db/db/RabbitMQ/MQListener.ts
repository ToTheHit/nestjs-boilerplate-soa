import mq, { RabbitMQHandler, TRabbitMqHandler } from './MQHandler';
import loggerRaw from '../../../lib/logger';
import HandlersMap from './HandlersMap';

const logger = loggerRaw('MQ LISTENER');

class MQListener {
    private app: TRabbitMqHandler;

    constructor() {
        this.app = mq;
    }

    async run() {
        await (<TRabbitMqHandler> this.app).connect();
    }

    async publish(queueName, type, message, additionalFields = {}, exchange) {
        return this.app.publish(queueName, type, message, additionalFields, exchange);
    }

    async subscribe(queueName, handler) {
        return this.app.subscribe(
            queueName,
            async (msg, acker) => {
                if (handler instanceof HandlersMap) {
                    await handler.handle(msg, acker);
                } else {
                    await handler(msg, acker);
                }
            },
            null,
            null
        );
    }

    async graceful() {
        logger.info('consumer shutdown %j', { status: 'START' });

        await (<RabbitMQHandler> this.app).close();

        logger.info('consumer shutdown %j', { status: 'DONE' });
    }
}

interface IQueueHandlers {
    queueName: string,
    eventsMap: HandlersMap
}
const RabbitMQInit = async (queueHandlers: IQueueHandlers[] = []) => {
    const listener =  new MQListener();

    await listener.run();

    for (const { queueName, eventsMap } of queueHandlers) {
        await listener.subscribe(queueName, eventsMap);
    }

    process.on('SIGTERM', () => listener.graceful());
    process.on('SIGINT', () => listener.graceful());
};

export { MQListener, RabbitMQInit };
