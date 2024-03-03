import { NestFactory } from '@nestjs/core';

import { RabbitMQInit } from '@db/RabbitMQ/MQListener';
import { redisInit } from '@db/Redis/Redis';
import eventsMap from '@srvAuth/events';
import AppModule from './module';

async function worker() {
    await redisInit();

    await NestFactory.create(AppModule(false));

    await RabbitMQInit([{ queueName: 'auth-events', eventsMap }]);
}
worker();
