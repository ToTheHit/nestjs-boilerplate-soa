import {
    Body,
    Query,
    Controller,
    Get,
    Post,
    Req, Res,
    UseInterceptors,
    UsePipes
} from '@nestjs/common';

import { ApiOperation } from '@nestjs/swagger';
import { ForbiddenError } from '../../../lib/errors';
import AuthRequestInterceptor from '@restify/Interceptors/AuthRequestInterceptor';
import GetInstanceInfoInterceptor from '@restify/Interceptors/GetInstanceInfoInterceptor';
import { emailRegexp, fullNameRegexp } from '@dbLib/regexps';
import RequestValidator from '@restify/validators/RequestValidator';
import NoAuthRequestInterceptor from '@restify/Interceptors/NoAuthRequestInterceptor';
import initSession from '../lib/initSession';
import emitBgEvent from '../../../srv-db/lib/emitBgEvent';

import User from '../models/user';
import Device from '../models/device';
import Token from '../models/token';

export default () => {
    @Controller()
    class AuthController {
        @Get('/me')
        @UseInterceptors(AuthRequestInterceptor(false))
        @UseInterceptors(GetInstanceInfoInterceptor)
        me(@Req() req) {
            return req.profile;
        }

        @Post('/signup')
        @ApiOperation({ summary: 'Get All Operations' })
        @UseInterceptors(NoAuthRequestInterceptor())
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
                    maxLength: 128,
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
            return initSession(req, res, req => User.signUpLocal(body, req.requestInfo), false, true);
        }

        @Post('/login')
        @UseInterceptors(NoAuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @UsePipes(RequestValidator(
            null,
            {
                login: {
                    type: String,
                    required: true,
                    match: emailRegexp
                },
                password: {
                    type: String,
                    minLength: 6,
                    required: true
                },
                lang: {
                    type: String
                },
                timeZone: {
                    type: String
                }
            }
        ))
        async logInHandler(@Req() req, @Res({ passthrough: true }) res, @Body() body) {
            return initSession(req, res, req => User.logInLocal(body, req.requestInfo));
        }

        @Post('/logout')
        @UseInterceptors(AuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        async logout(@Req() req) {
            if (req.fakeId) {
                delete req.fakeId;
                // initSessionCookies(req, res, req.user);
            } else {
                await req.dropSession('logout');
            }
        }

        // Запрос на смену пароля для не авторизированного пользователя
        @Get('/change-password')
        @UseInterceptors(NoAuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @UsePipes(RequestValidator(
            {
                token: {
                    type: String,
                    required: true
                }
            },
            null
        ))
        async checkToken(@Req() req, @Query() query) {
            await User.checkTokenExisting(query, Token.RESET_PASSWORD_TYPE, false);
        }

        @Post('/change-password')
        @UseInterceptors(NoAuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @UsePipes(RequestValidator(null, {
            login: {
                type: String,
                required: true
            }
        }))
        async askPasswordChange(@Req() req, @Body() body) {
            const user = await User.getAccountByLogin(body.login);

            if (!user) {
                throw new ForbiddenError('userIsNotRegistered');
            }

            // TODO: ограничить количество восстановлений
            await emitBgEvent.sendEvent('changePasswordRequest', { toId: user._id }, 'auth-events');
        }

        // Запрос на смену пароля для авторизированного пользователя
        @Post('/update-password')
        @UseInterceptors(AuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @UsePipes(RequestValidator(null, {
            oldPassword: {
                type: String,
                minLength: 6,
                maxLength: 128,
                required: true
            },
            newPassword: {
                type: String,
                minLength: 6,
                maxLength: 128,
                required: true
            }
        }))
        async updatePassword(@Req() req, @Res({ passthrough: true }) res, @Body() body) {
            const passwordChange = async (request, user, data) => {
                const currentUser = await (user
                    ? user.changePasswordByRequest(data.oldPassword, data.newPassword)
                    : User.changePasswordByToken(data.token, data.newPassword));

                await emitBgEvent.sendEvent('passwordChanged', { _user: currentUser._id }, 'auth-events');

                await Device.purgeDevices(currentUser, user ? request.sessionId : null);

                return currentUser;
            };

            return initSession(req, res, req => passwordChange(req, req.profile, body), true);
        }
    }

    return AuthController;
};
