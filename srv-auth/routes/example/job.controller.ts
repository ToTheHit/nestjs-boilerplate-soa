import { Controller, Get } from '@nestjs/common';

export default () => {
    @Controller()
    class JobController {
        // eslint-disable-next-line class-methods-use-this
        @Get('/customRouter')
        requestHandler() {
            return 'Jobs route';
        }

        // @Get('/test')
        // requestHandlerTest() {
        //     return 'Jobs route test';
        // }
    }

    return JobController;
};
