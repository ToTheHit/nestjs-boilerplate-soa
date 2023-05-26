import { Controller, Get } from '@nestjs/common';

@Controller()
export default class PublicObjectGetList {
    @Get()
    getHandler() {
        return 'PublicObject LIST route';
    }

    @Get('/random')
    getRandomHandler() {
        return 'PublicObject RANDOM route';
    }

    @Get('/filter')
    getFilterHandler() {
        return 'PublicObject FILTER route';
    }
}
