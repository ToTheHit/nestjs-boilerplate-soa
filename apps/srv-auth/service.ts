import { NestFactory } from '@nestjs/core';

import AppModule from './module';
import { RabbitMQInit } from '../../srv-db/db/RabbitMQ/MQListener';
import { redisInit } from '../../srv-db/db/Redis/Redis';
import initGlobalFilters from '../../lib/Restify/AllExceptionsFilter';

async function srv() {
    await redisInit();

    const app = await NestFactory.create(AppModule(true));

    initGlobalFilters(app);

    await RabbitMQInit();

    await app.listen(3001);
}
srv();
