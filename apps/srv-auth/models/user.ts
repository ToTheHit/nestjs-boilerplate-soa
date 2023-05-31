import SmartySchema from '../../../srv-db/models/SmartySchema';
import PublicObject, {
    IOptions, TPublicObject
} from '../../../srv-db/models/plugins/PublicObject';
import { ACCESS } from '../../../srv-db/lib/constants';
import AccountPlugin, { TAccountPlugin } from '../../../srv-db/models/plugins/AccountPlugin';
import ProfileWithToken, { TProfileWithToken } from '../../../srv-db/models/ProfileWithToken';
import WithEmail, { TWithEmail } from '../../../srv-db/models/plugins/WithEmail';
import ProfileWithAccess, { TProfileWithAccess } from '../../../srv-db/models/plugins/ProfileWithAccess';
import emitBgEvent from '../../../srv-db/lib/emitBgEvent';
import SmartyModel from '../../../srv-db/models/SmartyModel';
import SmartyDocument from '../../../srv-db/models/SmartyDocument';

class UserClass extends SmartyModel {
    async getUser() {
        return this;
    }

    async systemEvent(type, data = {}) {
        await emitBgEvent.sendEvent(type, {
            time: Date.now(),
            eventData: data,
            userMeta: (<TProfileWithToken><unknown> this).getMeta(),
            _user: this._id
        }, 'system-events');
    }

    async delaySystemEvent(type, delay, data = {}) {
        await emitBgEvent.sendDelayedEvent(
            this._id,
            type,
            {
                time: Date.now(),
                eventData: data,
                userMeta: (<TProfileWithToken><unknown> this).getMeta(),
                _user: this._id
            },
            Date.now() + delay,
            'system-events'
        );
    }

    async clearDelayedSystemEvent(type) {
        await emitBgEvent.clearDelayedEvent(this._id, type);
    }

    async makeOnline(connectionId) {
        const query = {
            $addToSet: { activeSocketSessions: connectionId },
            $set: { isOnline: true }
        };

        const wasOffline = this.isOnline !== true;

        await this.updateOne(query);

        this.set({ isOnline: true });

        return wasOffline;
    }

    async tryToMakeOffline(connectionId) {
        await this.updateOne({ $pull: { activeSocketSessions: connectionId } });

        const haveConnections = await this.model().findOne({
            _id: this._id,
            activeSocketSessions: { $ne: [] }
        })
            .select('_id')
            .lean();

        const isOffline = haveConnections === null;

        if (isOffline) {
            await this.updateOne({
                $set: {
                    isOnline: false,
                    _userLastOnlineDate: Date.now()
                }
            });

            this.set({ isOnline: false });
        }

        return isOffline;
    }
}

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
    { _id: true, id: false }
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
export type TUser = UserClass &
    TProfileWithAccess &
    TWithEmail &
    TProfileWithToken &
    TPublicObject &
    TAccountPlugin;
export type TUserDocument = TUser & SmartyDocument;
