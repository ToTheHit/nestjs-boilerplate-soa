import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { UserSchema } from './models/user';
import JobsModule from './routes/example/jobs.module';
import AppRoutingModule from './routes/example/AppRouting.module';
import AnswerInterceptor from '../lib/Restify/Interceptors/answerInterceptor';
import RequestInfoInterceptor from '../lib/Restify/Interceptors/requestInfo';

@Module({
    imports: [
        MongooseModule.forRoot('mongodb://127.0.0.1/nest'),
        MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
        JobsModule,
        AppRoutingModule
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
