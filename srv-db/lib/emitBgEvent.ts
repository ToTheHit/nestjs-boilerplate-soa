import mq from '../db/RabbitMQ/MQHandler';
import { TObjectId } from '../models/MagicSchema';

const queueTimer = 'timer';

const sender = (event: string, content = {}, queue: string, meta = {}) => {
    return mq.publish(queue, event, content, meta);
};

const stat = async (event: string, content = {}) => sender(event, { time: Date.now(), ...content }, 'statistic');

const sendEvent = async (
    event: string,
    content: {},
    queue: string,
    meta = {}
) => (
    sender(event, content, queue, meta)
);

const sendDelayedEventNX = async (
    id: string | TObjectId,
    event: string,
    content = {},
    time: number,
    queue: string
) => (
    sender(
        'setEvent',
        {},
        queueTimer,
        {
            id: `${event}_${id}`,
            time,
            routingKey: queue,
            payload: { type: event, data: content },
            nx: true
        }
    )
);
const sendDelayedEvent = async (
    id: string | TObjectId,
    event: string,
    content = {},
    time: number,
    queue: string
) => (
    sender(
        'setEvent',
        {},
        queueTimer,
        {
            id: `${event}_${id}`,
            time,
            routingKey: queue,
            payload: { type: event, data: content },
            nx: false
        }
    )
);
const clearDelayedEvent = async (ids: Array<string | TObjectId>, event: string) => Promise.all(
    (Array.isArray(ids) ? ids : [ids]).map(id => sender('delEvent', {}, queueTimer, { id: `${event}_${id}` }))
);

export default {
    stat,
    sendEvent,
    sendDelayedEvent,
    sendDelayedEventNX,
    clearDelayedEvent
};
