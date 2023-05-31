import { unsubscribeRedirectUrl, needConfirmAccountTime } from 'config';

import crypto from 'crypto';
import SmartyObject, { TSmartyObject } from './SmartyObject';
import { AccessDenied, NotAcceptable, ValidationError } from '../../../lib/errors';
import ProfileHuman, { TProfileHuman } from './ProfileHuman';
import SmartySchema from '../SmartySchema';
import AccountWithConfirmation, { TAccountWithConfirmation } from './AccountWithConfirmation';
import SmartyModel from '../SmartyModel';
import { TProfileWithToken } from '../ProfileWithToken';
import sha1 from '../../../lib/utils/sha1';
import emitBgEvent from '../../lib/emitBgEvent';
import { PublicInterfaceController } from './PublicObject/PublicInterface';
import { initSessionCookies } from '../../../lib/Restify/lib';

interface ISignUp {
    email: string;
    password: string;
    referrer?: string;
    country?: string;
    lang?: string;
}
class Account extends SmartyModel {
    set password(password) {
        (<TProfileWithToken><unknown> this).updateSalt();

        this.set({
            hashedPassword: this.model().encryptPassword(password, this.salt),
            _passwordUpdatedOn: Date.now()
        });
    }

    static async getDataByBoundPlatform(platforms) { // TODO: проверить, используется ли
        return (await SmartySchema.model('device').find({
            platform: { $in: platforms }
        })
            .select('_user')
            .lean())
            .map(({ _user }) => _user);
    }

    static async signUp(options: ISignUp, userMeta) {
        const {
            referrer = '',
            country = '',
            lang = 'ru',
            ...userData
        } = options;

        if (referrer || country) {
            Object.assign(userData, {
                regInfo: { referrer, country }
            });
        }

        Object.assign(userData, { locale: lang });
        Object.assign(userData, {
            phone: {
                number: '',
                type: 0
            }
        });

        const user = await (<PublicInterfaceController><unknown> this).createObject(null, userData);

        user.setMeta(userMeta);

        await Promise.all([
            emitBgEvent.sendDelayedEvent(
                user._id,
                'emailNeedConfirmAccount',
                { toId: user._id },
                Date.now() + needConfirmAccountTime,
                'auth-events'
            ),
            user.delaySystemEvent('noEmailConfirm', 2 * 60 * 60)
        ]);

        return user;
    }

    static async logIn(request, userMeta) {
        const user = await this.getAccountByLogin(request.login);

        if (!user) {
            throw new AccessDenied('userIsNotRegistered', {});
        }

        if (user.isBlocked) {
            throw new AccessDenied('You are blocked', {});
        }

        if (!user.checkPassword(request.password)) {
            throw new AccessDenied('blockGuardPasswordIncorrect', {});
        }

        if (process.env.NODE_ENV === 'production' && user.loginPerDay > 15) {
            throw new AccessDenied('count login error', {});
        }

        if (Date.now() - user.startLoginTime > 24 * 60 * 60 * 1000) {
            user.set({ loginPerDay: 1, startLoginTime: Date.now() });
        } else {
            user.loginPerDay += 1;
        }

        user.setMeta(userMeta);

        if (request.lang) {
            user.set({ locale: request.lang });
        }

        if (request.timeZone) {
            user.set({ timeZone: request.timeZone });
        }

        return user;
    }

    static async getAccountByLogin(searchString = '', additionalConditions = []) {
        if (!searchString && !additionalConditions.length) {
            return null;
        }

        const orQuery = [];

        if (SmartySchema.ObjectId.isValidStrict(searchString)) {
            orQuery.push({ _id: searchString.toLowerCase() });
        }

        orQuery.push({ email: searchString.toLowerCase() });

        const [account] = await this.find({ $or: [...orQuery, ...additionalConditions] })
            .limit(1);

        return account || null;
    }

    static async getAccountByToken(token, type = null, deleteAfter = true) {
        const { account, tokenObject } = await this.checkTokenExisting({ token }, type);

        if (deleteAfter) {
            await tokenObject.updateOne({
                $set: { isDeleted: true, _deletedOn: Date.now() }
            });
        }

        return account;
    }

    static async checkTokenExisting(request, type = null, returnAccount = true) {
        const { token } = request;

        if (!token) {
            throw new ValidationError('Token required');
        }

        const query = { value: token };

        if (type) {
            Object.assign(query, { type });
        }

        const tokenObject = await SmartySchema.model('token').findOne(query);

        if (!tokenObject) {
            throw new ValidationError('Token is incorrect', { token });
        }

        const account = await this.findById(tokenObject._owner);

        if (!account) {
            throw new ValidationError('Token is incorrect', { token });
        }

        return returnAccount
            ? { tokenObject, account }
            : null;
    }

    static async changePasswordByToken(tokenValue, newPassword) {
        const account = await this.getAccountByToken(
            tokenValue,
            // TODO: Добавить приведение типа
            SmartySchema.model('token').RESET_PASSWORD_TYPE
        );

        account.set({ password: newPassword });

        await account.save();

        await account.resetSessions();

        // FIXME: !!!
        // await mq.publish('socket-commands', 'disconnect-other-sessions', {
        //     _user: account._id,
        //     reason: 'password was changed'
        // });

        return account;
    }

    async changePasswordByCode(code, newPassword) {
        /*
            !((
                ['develop'].includes(process.env.NODE_ENV) || this.phone.number.slice(0, 5) === '+7000'
            ) && code !== '0000')
         */
        if (!['develop'].includes(process.env.NODE_ENV) && code !== '0000') {
            // FIXME: !!!
            // await confirmationCode.codeCheck(this, 'sms', code, 'ChangePasswordToken');
        }

        if (!newPassword) {
            throw new ValidationError('new password is required');
        }

        this.password = newPassword;

        return this.save();
    }

    async changePasswordByRequest(oldPassword, newPassword) {
        if (!oldPassword || !this.checkPassword(oldPassword)) {
            throw new ValidationError('Old password is incorrect');
        }

        if (!newPassword) {
            throw new ValidationError('new password is required');
        }

        this.password = newPassword;

        return this.save();
    }

    async changePhoneByRequest(oldPhone, newPhone) {
        if (!oldPhone || this.phone !== oldPhone) {
            throw new ValidationError('Old phone is incorrect');
        }

        if (!newPhone) {
            throw new ValidationError('New phone is required');
        }

        Object.assign(this.phone, {
            number: newPhone
        });

        return this.save();
    }

    static async getByAuthEmail(authEmail) {
        return this.findOne({ auth_email: authEmail });
    }

    static async getByPhone(phone) {
        return this.findOne({ 'phone.number': phone });
    }

    async getBoundPlatforms() {
        return Array.from(new Set((await SmartySchema.model('device').find({
            _user: this._id
        })
            .select('platform')
            .lean())
            .map(({ platform }) => platform)));
    }

    static encryptPassword(password, salt) {
        if (!password) {
            throw new NotAcceptable('password must be specified');
        }

        return sha1(password, salt);
    }

    checkPassword(password) {
        return this.model().encryptPassword(password, this.salt) === this.hashedPassword;
    }

    async confirmAccount() {
        this.set({ confirmed: true });

        await this.save();
    }

    async bumpActivity(sessionId, registration = false) {
        const { platform, deviceName } = this.getMeta();

        await emitBgEvent.sendEvent('bumpUserActivity', {
            _user: this._id,
            sessionId,
            platform,
            deviceName,
            registration
        }, 'auth-events');

        await this.delaySystemEvent('noVisitForFiveDays', 5 * 24 * 60 * 60 * 1000);
    }
}

class AccountController extends Account {
    static async logInLocal(request, userMeta) {
        const user = await this.logIn(request, userMeta);

        await user.save();
        await (<TSmartyObject><unknown> this).dbcaUpdate(user._id, user.getAffectedFields());

        return user;
    }

    static async signUpLocal(request, userMeta) {
        const user = await this.signUp(request, userMeta);

        await user.save();

        await (<TSmartyObject><unknown> this).dbcaUpdate(user._id, user.getAffectedFields());

        return user;
    }

    static async activateByToken(request) {
        const { token: tokenValue = null } = request;
        const account = await this.getAccountByToken(tokenValue, SmartySchema.model('token').ACTIVATE_TYPE);

        await account.confirmAccount();

        return account;
    }
}

function AccountPlugin(schema: SmartySchema) {
    schema.plugin(SmartyObject);

    schema.add({
        confirmed: {
            type: Boolean,
            default: false,
            protected: true
        },
        lastActivityDate: {
            type: Number,
            default: Date.now
        },
        hashedPassword: {
            type: String,
            required: true,
            private: true
        },
        _passwordUpdatedOn: {
            type: Number,
            default: Date.now(),
            protected: true,
            private: true
        },
        platforms: {
            type: [String],
            default: [],
            private: true,
            protected: true
        }
    });

    schema.onModelEvent('instance-pre-create', (profile, instance, baseObject, rawData) => (
        instance.set({ utm: rawData.utm })
    ));

    schema.plugin(ProfileHuman);
    schema.plugin(AccountWithConfirmation);

    schema.loadClass(Account, false);
    schema.loadClass(AccountController, false);

    schema.onModelEvent('instance-validate', async function (profile, instance, rawData) {
        if (instance.isNewObject()) {
            const accountsInCRM = await this.countDocuments({ email: rawData.email });

            console.log('>>> accountsInCRM', accountsInCRM);
            if (accountsInCRM > 0) {
                throw new ValidationError('emailAlreadyRegistered');
            }

            instance.set({ auth_email: rawData.email });
        }
    });
}

export default AccountPlugin;

export type TAccountPlugin = Account & AccountController & TProfileHuman & TAccountWithConfirmation;
