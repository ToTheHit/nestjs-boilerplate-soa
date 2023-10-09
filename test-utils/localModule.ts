import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import assertionsFn from './assertions';
import AuthModule from '../apps/srv-auth/module';
import initGlobalFilters from '../lib/Restify/AllExceptionsFilter';
import { RabbitMQInit } from '../srv-db/db/RabbitMQ/MQListener';
import AuthEvents from '../apps/srv-auth/events';

// import AuthService from '../apps/srv-auth/service';

const fn = async () => {
    await assertionsFn();
    // await redisInit();

    const moduleRef = await Test.createTestingModule({
        imports: [AuthModule(true)]
    })
        .compile();

    const app: INestApplication = moduleRef.createNestApplication();

    initGlobalFilters(app);

    await app.init();
    await RabbitMQInit([{ queueName: 'auth-events', eventsMap: AuthEvents }]);

    return app;
};

export default fn;
