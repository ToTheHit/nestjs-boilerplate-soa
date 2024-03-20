import MagicSchema from '@models/MagicSchema';
import AccountObject, { IAccountObjectOptions } from '@plugins/AccountObject';

import { randKey as generateToken } from '@lib/utils/token';
import MagicModel from '@models/MagicModel';

const RESET_PASSWORD_TYPE = 'resetPassword';
const ACTIVATE_TYPE = 'activate';
const UNSUBSCRIBE_TYPE = 'unsubscribe';

const TokenSchema = new MagicSchema({
    value: {
        type: String,
        unique: true, // Т.к. это поле уже создаёт индекс, дополнительно индексировать не надо
        private: true
    },

    type: {
        type: String,
        enum: [
            RESET_PASSWORD_TYPE,
            ACTIVATE_TYPE,
            UNSUBSCRIBE_TYPE
        ],
        required: true,
        private: true
    }
});

class TokenClass extends MagicModel {
    static ACTIVATE_TYPE = ACTIVATE_TYPE;

    static UNSUBSCRIBE_TYPE = UNSUBSCRIBE_TYPE;

    static RESET_PASSWORD_TYPE = RESET_PASSWORD_TYPE;

    static async createToken(_owner, type) {
        const value = await generateToken();

        await this.create({
            _id: new MagicSchema.ObjectId(), _owner, type, value
        });

        return value;
    }

    static async createPasswordToken(owner) {
        return this.createToken(owner._id, RESET_PASSWORD_TYPE);
    }

    static async createActivateToken(owner) {
        return this.createToken(owner._id, ACTIVATE_TYPE);
    }

    static async createUnsubscribeToken(owner) {
        return this.createToken(owner._id, UNSUBSCRIBE_TYPE);
    }
}

TokenSchema.plugin<IAccountObjectOptions>(AccountObject, {});

TokenSchema.loadClass(TokenClass, false);

const Token = TokenSchema.model('token', 'tokens');

export default Token;
