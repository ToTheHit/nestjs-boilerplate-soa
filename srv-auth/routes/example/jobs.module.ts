import { Module } from '@nestjs/common';
import PublicObjectController from '../PublicObject';

import JobController from './job.controller';
import JobsInterviewsController from './jobsInterviews.controller';

@Module({
    controllers: [
        ...PublicObjectController(), // Роутеры из PublicObject
        JobController(), // Кастомные роутеры для модели
        JobsInterviewsController // Роутеры с дочерними моделями
    ]
})
export default class JobsModule {}
