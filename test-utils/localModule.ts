import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import initGlobalFilters from '@restify/AllExceptionsFilter';
import { RabbitMQInit } from '@db/RabbitMQ/MQListener';
import AuthModule from '@srvAuth/module';
import AuthEvents from '@srvAuth/events';

import assertionsFn from './assertions';

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
