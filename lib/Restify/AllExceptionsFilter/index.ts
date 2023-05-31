import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import AllExceptionsFilter from './AllExceptionsFilter';
import NotFoundExceptionFilter from './NotFoundExceptionFilter';

export default (app: INestApplication) => {
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    // Обработка запроса к несуществующему роутеру
    app.useGlobalFilters(new NotFoundExceptionFilter(app.get(HttpAdapterHost)));
};
