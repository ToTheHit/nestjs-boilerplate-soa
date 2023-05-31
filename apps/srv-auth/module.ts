import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { UserSchema } from './models/user';
import AnswerInterceptor from '../../lib/Restify/Interceptors/answerInterceptor';
import RequestInfoInterceptor from '../../lib/Restify/Interceptors/requestInfo';
import { AuthModule, AuthRoutingModule } from './routes/auth.module';
import MongoDB from '../../srv-db/db/MongoDB';

export default (addRoutes = true) => {
    const routes = [
        AuthModule,
        AuthRoutingModule
    ];

    @Module({
        imports: [
            ...MongoDB('mongodb://127.0.0.1:27017/nestjs', [{ name: 'User', schema: UserSchema }]),
            ...(addRoutes ? routes : [])
        ],
        providers: [
            {
                provide: APP_INTERCEPTOR,
                useClass: RequestInfoInterceptor
            },
            {
                provide: APP_INTERCEPTOR,
                useClass: AnswerInterceptor
            }
        ]
    })
    class AppModule {}

    return AppModule;
};
