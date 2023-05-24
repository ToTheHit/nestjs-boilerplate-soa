import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './models/user';
import { AppService } from './service';
import AppController from './controller';

const ROUTES = [
    {
        path: '/',
        module: ''
    }
];

@Module({
    imports: [
        MongooseModule.forRoot('mongodb://127.0.0.1/nest'),
        MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])
    ],
    controllers: [
        AppController
    ],
    providers: [
        AppService
    ]
})
export class AppModule {}
