import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { UserSchema } from './models/user';
import AnswerInterceptor from '../../lib/Restify/Interceptors/answerInterceptor';
import RequestInfoInterceptor from '../../lib/Restify/Interceptors/requestInfo';
import { AuthModule, AuthRoutingModule } from './routes/auth.module';
import MongoDB from '../../srv-db/db/MongoDB';
import { DeviceSchema } from './models/device';

export default (addRoutes = true) => {
    const routes = [
        AuthModule,
        AuthRoutingModule
    ];

    const mongodbUri = process.env.NODE_ENV !== 'test'
        ? 'mongodb://127.0.0.1:27017/nestjs'
        : 'mongodb://127.0.0.1:27018/nestjs';

    @Module({
        imports: [
            ...MongoDB(mongodbUri, [
                { name: 'User', schema: UserSchema },
                { name: 'Device', schema: DeviceSchema }
            ]),
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
