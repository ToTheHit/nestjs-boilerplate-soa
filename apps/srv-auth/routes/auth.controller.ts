import {
    Body,
    Controller,
    Get,
    Post,
    Req, Res,
    UseInterceptors,
    UsePipes
} from '@nestjs/common';
import * as crypto from 'crypto';

import AuthRequestInterceptor from '@restify/Interceptors/AuthRequestInterceptor';
import GetInstanceInfoInterceptor from '@restify/Interceptors/GetInstanceInfoInterceptor';
import { emailRegexp, fullNameRegexp } from '@dbLib/regexps';
import RequestValidator from '@restify/validators/RequestValidator';
import NoAuthRequestInterceptor from '@restify/Interceptors/NoAuthRequestInterceptor';
import { initSessionCookies } from '@restify/lib';

import User from '../models/user';

export default () => {
    @Controller()
    class AuthController {
        @Get('/me')
        @UseInterceptors(AuthRequestInterceptor(false, false))
        @UseInterceptors(GetInstanceInfoInterceptor)
        me(@Req() req) {
            return req.profile;
        }

        @Post('/signup')
        @UseInterceptors(NoAuthRequestInterceptor(true))
        @UseInterceptors(GetInstanceInfoInterceptor)
        @UsePipes(RequestValidator(
            null,
            {
                email: {
                    type: String,
                    required: true,
                    match: emailRegexp
                },
                password: {
                    type: String,
                    minLength: 6,
                    required: true
                },
                fullName: {
                    type: String,
                    required: true,
                    match: fullNameRegexp,
                    maxlength: 50
                }
            }
        ))
        async signUpHandler(@Req() req, @Res({ passthrough: true }) res, @Body() body) {
            req.user = await User.signUpLocal(body, req.requestInfo);
            req.profile = req.user;
            req.sessionId = crypto.randomUUID();

            initSessionCookies(req, res, req.user);

            await Promise.all([
                // Login.handleLogin(req.user, req),
                req.user.bumpActivity(req.sessionId, true)
            ]);

            return req.user;
        }
    }

    return AuthController;
};
