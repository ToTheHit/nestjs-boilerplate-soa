import { Controller, Get } from '@nestjs/common';

// jobs/interviews
@Controller('/interviews')
export default class JobsInterviewsController {
    @Get()
    requestHandler() {
        return 'Job interviews route';
    }
}
