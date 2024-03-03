import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import MongoDB from '@db/MongoDB';
import AnswerInterceptor from '@restify/Interceptors/answerInterceptor';
import { UserSchema } from '@srvAuth/models/user';
import AuthRoutingModule from '@srvAuth/routes/auth.module';
import { DeviceSchema } from '@srvAuth/models/device';
import MediaRoutingModule from '@srvMedia/routes/media.module';
import { FileSchema } from '@srvMedia/files/file';
import { CatalogSchema } from '@srvMedia/files/catalog';
import RequestInfoInterceptor from '../../lib/Restify/Interceptors/requestInfo';
import { ProjectSchema } from '../srv-project/models/project';
import ProjectRoutingModule from '../srv-project/routes/project.module';

export default (addRoutes = true) => {
    const routes = [
        AuthRoutingModule,
        ProjectRoutingModule,
        MediaRoutingModule
    ];

    const mongodbUri = process.env.NODE_ENV !== 'test'
        ? 'mongodb://127.0.0.1:27017/nestjs'
        : 'mongodb://127.0.0.1:27018/nestjs';

    @Module({
        imports: [
            ...MongoDB(mongodbUri, [
                { name: 'User', schema: UserSchema },
                { name: 'Device', schema: DeviceSchema },
                { name: 'Project', schema: ProjectSchema },
                { name: 'File', schema: FileSchema },
                { name: 'Catalog', schema: CatalogSchema }
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
