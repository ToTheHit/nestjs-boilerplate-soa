import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { UserSchema } from './models/user';
import AnswerInterceptor from '../lib/Restify/Interceptors/answerInterceptor';
import RequestInfoInterceptor from '../lib/Restify/Interceptors/requestInfo';
import { AuthModule, AuthRoutingModule } from './routes/auth.module';
import MongoDB from '../srv-db/db/MongoDB';

@Module({
    imports: [
        ...MongoDB([{ name: 'User', schema: UserSchema }]),
        AuthModule,
        AuthRoutingModule
        // JobsModule,
        // AppRoutingModule
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
export default class AppModule {}
