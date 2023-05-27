import { Module } from '@nestjs/common';

import JobController from './job.controller';
import JobsInterviewsController from './jobsInterviews.controller';
import PublicObjectController from '../../../lib/Restify/plugins/PublicObject/index';

@Module({
    controllers: [
        ...PublicObjectController(), // Роутеры из PublicObject
        JobController(), // Кастомные роутеры для модели
        JobsInterviewsController // Роутеры с дочерними моделями
    ]
})
export default class JobsModule {}
