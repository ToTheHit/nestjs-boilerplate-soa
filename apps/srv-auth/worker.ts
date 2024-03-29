import { NestFactory } from '@nestjs/core';

import { RabbitMQInit } from '@db/RabbitMQ/MQListener';
import { redisInit } from '@db/Redis/Redis';
import AppModule from './module';
import eventsMap from './events';

async function worker() {
    await redisInit();

    await NestFactory.create(AppModule(false));

    await RabbitMQInit([{ queueName: 'auth-events', eventsMap }]);
}
worker();
