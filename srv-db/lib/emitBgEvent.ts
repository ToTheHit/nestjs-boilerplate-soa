import mq from '../db/RabbitMQ/MQHandler';

const queueTimer = 'timer';

const sender = (event, content, queue, meta = {}) => {
    return mq.publish(queue, event, content, meta);
};

const stat = async (event, content = {}) => sender(event, { time: Date.now(), ...content }, 'statistic');
const sendEvent = async (event, content, queue, meta = {}) => sender(event, content, queue, meta);
const sendDelayedEventNX = async (id, event, content, time, queue) => sender('setEvent', {}, queueTimer, {
    id: `${event}_${id}`,
    time,
    routingKey: queue,
    payload: { type: event, data: content },
    nx: true
});
const sendDelayedEvent = async (id, event, content, time, queue) => sender('setEvent', {}, queueTimer, {
    id: `${event}_${id}`,
    time,
    routingKey: queue,
    payload: { type: event, data: content },
    nx: false
});
const clearDelayedEvent = async (ids, event) => Promise.all(
    (Array.isArray(ids) ? ids : [ids]).map(id => sender('delEvent', {}, queueTimer, { id: `${event}_${id}` }))
);

export default {
    stat,
    sendEvent,
    sendDelayedEvent,
    sendDelayedEventNX,
    clearDelayedEvent
};
