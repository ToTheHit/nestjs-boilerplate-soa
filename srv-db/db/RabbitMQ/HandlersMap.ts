import mq from './MQHandler';
import loggerRaw from '../../../lib/logger';

const logger = loggerRaw('HANDLER');

class HandlersMap extends Map {
    async handle(msg, acker) {
        const fn = this.get(msg.type);
        const startTime = Date.now();

        try {
            if (fn) {
                await fn(msg);
            }

            acker.ack();

            const json = JSON.stringify(msg);

            logger.debug('DONE %s %j', msg.type, {
                msg: (json.length <= 2048)
                    ? json
                    : `${json.substring(0, 2048)}...`,
                time: Date.now() - startTime
            });

            if (Array.isArray(msg.chained) && msg.chained.length > 0) {
                const [entry, ...chained] = msg.chained;

                await mq.publish(entry.queue, entry.action, entry.data, { chained });
            }
        } catch (error) {
            logger.error(error, msg.type, {
                msg,
                time: Date.now() - startTime
            });

            // acker.nack(); // TODO: начать по-нормальному обрабатывать ситуацию при возникновении ошибки

            acker.ack();

            if (process.env.NODE_ENV === 'test') {
                throw error;
            }
        }
    }

    static transfer(queue) {
        return ({ type, data }) => mq.publish(queue, type, data);
    }
}

export default HandlersMap;
