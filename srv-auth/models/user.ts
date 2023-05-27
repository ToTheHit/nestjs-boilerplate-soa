import { Document } from 'mongoose';
import SmartySchema from '../../srv-db/models/SmartySchema';
import PublicObject, {
    IOptions
} from '../../srv-db/models/plugins/PublicObject';
import { ACCESS } from '../../srv-db/lib/constants';
import AccountPlugin from '../../srv-db/models/plugins/AccountPlugin';
import ProfileWithToken from '../../srv-db/models/ProfileWithToken';
import WithEmail from '../../srv-db/models/plugins/WithEmail';
import ProfileWithAccess from '../../srv-db/models/plugins/ProfileWithAccess';

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

UserSchema.plugin(ProfileWithAccess);
UserSchema.plugin(WithEmail);

UserSchema.plugin(ProfileWithToken, {
    requestQuotaInterval: 900,
    requestQuotaNumber: 1000
});

UserSchema.plugin(PublicObject, PublicObjectOptions);
UserSchema.plugin(AccountPlugin);

UserSchema.loadClass(UserClass, false);

export default UserSchema.model('user', 'users');

export { UserSchema };
export type UserDocument = Document;
