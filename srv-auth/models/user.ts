import { Document } from 'mongoose';
import SmartySchema from '../../srv-db/models/SmartySchema';
import PublicObject, {
    IOptions
} from '../../srv-db/models/plugins/PublicObject';
import { ACCESS } from '../../srv-db/lib/constants';
import AccountPlugin from '../../srv-db/models/plugins/AccountPlugin';

class UserClass {}

const UserSchema = new SmartySchema(
    {
        _lastWs: {
            type: SmartySchema.Types.ObjectId,
            ref: 'workspace',
            protected: true,
            default: null
        },

        createdAt: Number
    },
    { id: false }
);

const PublicObjectOptions: IOptions = {
    defaultSortOrder: 1,
    API_NAME: 'Пользователь',
    targetProfile: 'user',
    API_PREFIX: 'user',
    checkAccessToCreate: false,
    async getPermittedProfiles() {
        return [this._id];
    },
    async getAccessRights() {
        return null;
    },
    async accessChecker(user, rights, method) {
        return (
            (!user && (method === 'create' || method === 'read')) ||
      (user &&
        (method === 'update' || method === 'read') &&
        user._id.equals(this._id))
        );
    },
    fieldALLOWED: {
        async getInstance() {
            return { allowed: ACCESS.ACT_READ_UPDATE };
        },
        async getStatic(profile, users) {
            const result = {};

            for (const { _id } of users) {
                result[_id] = {
                    allowed: _id.equals(profile._id)
                        ? ACCESS.ACT_READ_UPDATE
                        : ACCESS.ACT_NONE
                };
            }

            return result;
        }
    },
    defaultSortField: '_createdOn'
};

UserSchema.plugin(PublicObject, PublicObjectOptions);
UserSchema.plugin(AccountPlugin);
UserSchema.loadClass(UserClass, false);

export default UserSchema.model('user', 'users');

export { UserSchema };
export type UserDocument = Document;
