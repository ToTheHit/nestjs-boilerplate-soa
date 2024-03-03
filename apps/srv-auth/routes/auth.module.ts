import { rest } from 'config';
import { RouterModule } from '@nestjs/core';
import { Module } from '@nestjs/common';

import AuthController from './auth.controller';
import User from '../models/user';

@Module({
    controllers: [
        AuthController()
    ]
})
class AuthModule {}

@Module({
    imports: [
        AuthModule,
        RouterModule.register([
            {
                path: `${rest.api}/:collectionName(${User.getPublicName()})`,
                module: AuthModule
            }
        ])],
    exports: [RouterModule]
})
class AuthRoutingModule {}

export default AuthRoutingModule;
