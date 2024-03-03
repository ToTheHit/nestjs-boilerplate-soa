import {
    Body,
    Controller,
    Get,
    Post, Query,
    Req, Res,
    UseInterceptors
} from '@nestjs/common';

import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import AuthRequestInterceptor from '@restify/Interceptors/AuthRequestInterceptor';
import GetInstanceInfoInterceptor from '@restify/Interceptors/GetInstanceInfoInterceptor';
import { emailRegexp, fullNameRegexp } from '@dbLib/regexps';
import {
    RequestValidatorDecorator
} from '@restify/validators/RequestValidator';
import NoAuthRequestInterceptor from '@restify/Interceptors/NoAuthRequestInterceptor';
import autoDocs from '@srvDoc/decorators/autoDoc';
import FilterValidator from '@restify/validators/plugins/FilterValidator';
import Token from '@srvAuth/token';
import { ForbiddenError } from '@lib/errors';
import emitBgEvent from '@dbLib/emitBgEvent';
import Device from '@srvAuth/device';
import initSession from '../lib/initSession';

import User from '../models/user';

export default () => {
    @Controller()
    @ApiTags(User.getPublicName())
    class AuthController {
        @Get('/me')
        @autoDocs({
            apiOperation: { summary: 'Me', description: 'user info' },
            apiOkResponse: { Model: User }
        })
        @UseInterceptors(AuthRequestInterceptor(false))
        @UseInterceptors(GetInstanceInfoInterceptor)
        me(@Req() req) {
            return req.profile;
        }

        @Post('/signup')
        @autoDocs({
            apiOperation: { summary: 'Signup', description: 'signup user' },
            apiOkResponse: { Model: User }
        })
        @UseInterceptors(NoAuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @RequestValidatorDecorator(
            {},
            {
                validators: [{
                    validator: FilterValidator,
                    options: {
                        Model: User
                    }
                }],
                additionalValidation: {
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
            }
        )
        async signUpHandler(@Req() req, @Res({ passthrough: true }) res, @Body() body) {
            return initSession(req, res, req => User.signUpLocal(body, req.requestInfo), false, true);
        }

        @Post('/login')
        @ApiOperation({ summary: 'Login', description: 'login user' })
        // @ApiOkResponse({ type: DUser })
        @UseInterceptors(NoAuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @RequestValidatorDecorator(
            {},
            {
                additionalValidation: {
                    login: {
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
                    lang: {
                        type: String
                    },
                    timeZone: {
                        type: String
                    }
                }
            }
        )
        async logInHandler(@Req() req, @Res({ passthrough: true }) res, @Body() body) {
            return initSession(req, res, req => User.logInLocal(body, req.requestInfo));
        }

        @Post('/logout')
        @ApiOperation({ summary: 'Logout', description: 'Logout user' })
        @ApiOkResponse({ type: null })
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
        @ApiOperation({ summary: 'Change password', description: 'Change password user' })
        @ApiOkResponse({ type: null })
        @UseInterceptors(NoAuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @RequestValidatorDecorator(
            {
                additionalValidation: {
                    token: {
                        type: String,
                        required: true
                    }
                }
            },
            {}
        )
        async checkToken(@Req() req, @Query() query) {
            await User.checkTokenExisting(query, Token.RESET_PASSWORD_TYPE, false);
        }

        @Post('/change-password')
        @ApiOperation({ summary: 'Change password', description: 'Change password user' })
        @ApiOkResponse({ type: null })
        @UseInterceptors(NoAuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @RequestValidatorDecorator(
            {},
            {
                additionalValidation: {
                    login: {
                        type: String,
                        required: true
                    }
                }

            }
        )
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
        @ApiOperation({ summary: 'Update password', description: 'Update password user' })
        @ApiOkResponse({ type: null })
        @UseInterceptors(AuthRequestInterceptor())
        @UseInterceptors(GetInstanceInfoInterceptor)
        @RequestValidatorDecorator(
            {},
            {
                additionalValidation: {
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
                }
            }
        )
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
