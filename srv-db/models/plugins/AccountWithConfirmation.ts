import mongoose from 'mongoose';
import SmartySchema, { TSmartySchemaStatic } from '../SmartySchema';
import { NotAcceptable, ValidationError } from '../../../lib/errors';
import emitBgEvent from '../../lib/emitBgEvent';
import SmartyModel from '../SmartyModel';

const UNCONFIRMED = 'not_confirmed';
const CONFIRMED = 'confirmed';

// eslint-disable-next-line no-use-before-define
class AccountWithConfirmationClass extends SmartyModel {
    static CONFIRM_TYPES = {
        UNCONFIRMED,
        CONFIRMED
    };

    static async getConfirmedIds(idsList, customQuery = {}) {
        return idsList.length === 0
            ? []
            : this.find({
                _id: { $in: idsList },
                emailConfirmedStatus: CONFIRMED,
                ...customQuery
            })
                .select('_id')
                .lean();
    }

    checkAllConfirm() {
        return this.emailConfirmedStatus === CONFIRMED;
    }

    async confirmEmail(email, emailConfirmedStatus = CONFIRMED) { // TODO: вынести все .set и .save в методы модели
        const sendNotif = this.emailConfirmedStatus === UNCONFIRMED && emailConfirmedStatus !== UNCONFIRMED;

        const oldStatus = this.emailConfirmedStatus;

        if (oldStatus === CONFIRMED && emailConfirmedStatus === CONFIRMED) {
            throw new NotAcceptable('already confirmed');
        }
        this.set({
            confirmed: true,
            emailConfirmedStatus,
            email,
            createdAt: new Date()
        });

        await this.save();

        const promises = [
            emitBgEvent.clearDelayedEvent(this._id, 'emailNeedConfirmAccount'),
            this.clearDelayedSystemEvent('noEmailConfirm'),
            this.systemEvent('emailConfirmed', {
                oldStatus,
                newStatus: emailConfirmedStatus
            }),
            (<TSmartySchemaStatic> this.model()).emitModelEvent('instance-post-confirm-email', this),
            this.model().dbcaUpdate(this._id, ['email', 'emailConfirmedStatus'])
        ];

        if (sendNotif) {
            promises.push(emitBgEvent.sendEvent('registration', { toId: this._id }, 'auth-events'));
        }
        await Promise.all(promises);
    }

    async checkEmailConfirmationAllowed(email) {
        const emailDupCount = await (<SmartyModel> this.model())
            .countDocuments({ email, emailConfirmedStatus: CONFIRMED });

        if (emailDupCount > 0) {
            throw new NotAcceptable('UserWithEmailAlreadyRegistered');
        }

        this.checkEmailChangeAllowed(email);
    }

    checkEmailChangeAllowed(email) {
        if (this.emailConfirmedStatus === this.model().CONFIRM_TYPES.CONFIRMED && this.email === email) {
            throw new ValidationError('emailConfirmed');
        }
    }

    async setEmailForConfirm(email) {
        this.set({
            lastEmail: email
        });

        await this.save();
        await this.model().dbcaUpdate(this._id, ['lastEmail']);
    }
}
function AccountWithConfirmation(schema: SmartySchema) {
    schema.add({
        emailConfirmedStatus: {
            enum: [
                UNCONFIRMED,
                CONFIRMED
            ],
            type: String,
            protected: true,
            description: 'not_confirmed - новый пользователь, заблокировано все API, ' +
                'confirmed - почта подтверждена, все доступно',
            default: UNCONFIRMED
        },

        lastEmail: {
            type: String,
            default: '',
            description: 'Последний введенный email при регистрации',
            protected: true
        }
    });

    schema.loadClass(AccountWithConfirmationClass, false);
}

export default AccountWithConfirmation;
