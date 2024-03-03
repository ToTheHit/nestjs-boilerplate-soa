import { NestFactory } from '@nestjs/core';
import { port } from 'config';
import { DocumentBuilder } from '@nestjs/swagger';

import SwaggerModuleCustom from '@srvDoc/utils/Swagger';
import { RedocModule, RedocOptions } from 'nestjs-redoc';
import AppModule from './module';
import { version } from '../../package.json';

async function swagger() {
    const app = await NestFactory.create(AppModule(true));

    const config = new DocumentBuilder()
        .setTitle('Documentation')
        .setVersion(version)
        .build();

    const document = SwaggerModuleCustom.createDocument(app, config);

    const redocOptions: RedocOptions = {
        title: 'Demo AutoDoc',
        sortPropsAlphabetically: true,
        hideDownloadButton: false,
        hideHostname: false
    };

    // @ts-ignore
    await RedocModule.setup('redoc', app, document, redocOptions);

    SwaggerModuleCustom.setup('swagger', app, document, { swaggerOptions: { showExtensions: true } });

    await app.listen(port.doc);
}

swagger();
