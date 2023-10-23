import { NestFactory } from '@nestjs/core';
import { port } from 'config';

import { RabbitMQInit } from '@db/RabbitMQ/MQListener';
import { redisInit } from '@db/Redis/Redis';
import initGlobalFilters from '@restify/AllExceptionsFilter';

import AppModule from './module';

async function srv() {
    await redisInit();

    const app = await NestFactory.create(AppModule(true));

    initGlobalFilters(app);

    await RabbitMQInit();

    await app.listen(port.auth);
}

srv();
