import { port } from 'config';
import { NestFactory } from '@nestjs/core';

import { redisInit } from '@db/Redis';
import AppModule from '@srvMedia/module';
import initGlobalFilters from '@restify/AllExceptionsFilter';
import { RabbitMQInit } from '@db/MQListener';

async function srv() {
    await redisInit();

    const app = await NestFactory.create(AppModule(true));

    initGlobalFilters(app);

    await RabbitMQInit();

    await app.listen(port.media);
}

srv();
