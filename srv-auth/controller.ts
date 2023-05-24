import { Controller, Get } from '@nestjs/common';
import { AppService } from './service';

@Controller()
export default class AppController {
    // eslint-disable-next-line no-useless-constructor
    constructor(private readonly appService: AppService) {}

  @Get()
    async getHello(): Promise<string> {
        console.log('######');

        return this.appService.getHello();
    }
}
