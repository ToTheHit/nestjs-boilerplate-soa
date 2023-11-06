import { NestFactory } from '@nestjs/core';

import AppModule from './module';
import { RabbitMQInit } from '../../srv-db/db/RabbitMQ/MQListener';
import { redisInit } from '../../srv-db/db/Redis/Redis';
import eventsMap from './events';

async function worker() {
    await redisInit();

    await NestFactory.create(AppModule(false));

    await RabbitMQInit([{ queueName: 'auth-events', eventsMap }]);
}
worker();
