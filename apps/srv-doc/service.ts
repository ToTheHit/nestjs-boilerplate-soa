import { NestFactory } from '@nestjs/core';
import { port } from 'config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { version } from '../../package.json';

import AppModule from './module';

async function swagger() {
    const app = await NestFactory.create(AppModule(true));

    const options = new DocumentBuilder()
        .setTitle('Documentation')
        .setVersion(version)
        .build();

    const document = SwaggerModule.createDocument(app, options);

    await SwaggerModule.setup('user', app, document, { swaggerOptions: { showExtensions: true } });

    await app.listen(port.doc);
}

swagger();
