import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import MongoDB from '@db/MongoDB';

import AnswerInterceptor from '@restify/Interceptors/answerInterceptor';
import RequestInfoInterceptor from '@restify/Interceptors/requestInfo';

import { UserSchema } from './models/user';
import { AuthModule, AuthRoutingModule } from './routes/auth.module';
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
