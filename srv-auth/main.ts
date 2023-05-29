import { NestFactory, HttpAdapterHost } from '@nestjs/core';

import mongoose from 'mongoose';
import AppModule from './module';
import AllExceptionsFilter from '../lib/Restify/AllExceptionsFilter/AllExceptionsFilter';
import NotFoundExceptionFilter from '../lib/Restify/AllExceptionsFilter/NotFoundExceptionFilter';

async function srv() {
    console.log('>>>> SRV-AUTH INIT');
    await mongoose.connect('mongodb://127.0.0.1:27017');
    const app = await NestFactory.create(AppModule);

    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    // Обработка запроса к несуществующему роутеру
    app.useGlobalFilters(new NotFoundExceptionFilter(app.get(HttpAdapterHost)));
    await app.listen(3001);
}
srv();
