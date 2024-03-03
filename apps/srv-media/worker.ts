import { NestFactory } from '@nestjs/core';

import { RabbitMQInit } from '@db/RabbitMQ/MQListener';
import { redisInit } from '@db/Redis/Redis';
import eventsMap from '@srvMedia/events';
import AppModule from './module';

async function worker() {
    await redisInit();

    await NestFactory.create(AppModule(false));

    await RabbitMQInit([{ queueName: 'media-events', eventsMap }]);
}
worker();
