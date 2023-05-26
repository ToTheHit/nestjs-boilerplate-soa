import { RouterModule } from '@nestjs/core';
import { Module } from '@nestjs/common';
import JobsModule from './jobs.module';

const ROUTES = [
    {
        path: ':collectionName(jobs)', // jobs = Model.getPublicName()
        module: JobsModule
    }
];

@Module({
    imports: [RouterModule.register(ROUTES)],
    exports: [RouterModule]
})
export default class AppRoutingModule {}
