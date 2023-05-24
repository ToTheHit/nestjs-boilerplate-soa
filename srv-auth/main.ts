import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';

async function srv() {
    console.log('>>>> SRV-AUTH INIT');

    const app = await NestFactory.create(AppModule);
    // console.log('!!!', app);

    await app.listen(3001);
}
srv();
