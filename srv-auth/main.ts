import { NestFactory, HttpAdapterHost } from '@nestjs/core';

import AppModule from './module';
import AllExceptionsFilter from '../lib/Restify/AllExceptionsFilter/AllExceptionsFilter';
import NotFoundExceptionFilter from '../lib/Restify/AllExceptionsFilter/NotFoundExceptionFilter';

async function srv() {
    console.log('>>>> SRV-AUTH INIT');

    const app = await NestFactory.create(AppModule);

    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    // Обработка запроса к несуществующему роутеру
    app.useGlobalFilters(new NotFoundExceptionFilter(app.get(HttpAdapterHost)));
    await app.listen(3001);
}
srv();
