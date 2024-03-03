import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import { RabbitMQInit } from '@db/RabbitMQ/MQListener';
import initGlobalFilters from '@restify/AllExceptionsFilter';
import AuthModule from '@srvAuth/module';
import AuthEvents from '@srvAuth/events';

const fn = async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [
            AuthModule(true)
        ]
    })
        .compile();

    const app: INestApplication = moduleRef.createNestApplication();

    initGlobalFilters(app);

    await app.init();
    await RabbitMQInit([{ queueName: 'auth-events', eventsMap: AuthEvents }]);

    return app;
};

export default fn;
