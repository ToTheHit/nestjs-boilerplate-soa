import AccountPlugin, { TAccountPlugin, TAccountPluginStatic } from '@plugins/AccountPlugin';
import ProfileWithToken, { TProfileWithToken, TProfileWithTokenStatic } from '@models/ProfileWithToken';
import WithEmail, { IWithEmailOptions, TWithEmail, TWithEmailStatic } from '@plugins/WithEmail';
import PublicObject, {
    PublicObjectOptions, TPublicObject, TPublicObjectStatic
} from '@plugins/PublicObject';
import ProfileWithAccess, {
    TProfileWithAccess,
    TProfileWithAccessStatic
} from '@plugins/ProfileWithAccess';
import MagicSchema from '@models/MagicSchema';
import MagicModel from '@models/MagicModel';
import MagicDocument from '@models/MagicDocument';
import { ACCESS } from '@dbLib/constants';
import emitBgEvent from '@dbLib/emitBgEvent';

class UserClass extends MagicModel {
    async getUser() {
        return this;
    }

    async systemEvent(type: string, data = {}) {
        await emitBgEvent.sendEvent(type, {
            time: Date.now(),
            eventData: data,
            userMeta: (<TProfileWithToken><unknown> this).getMeta(),
            _user: this._id
        }, 'system-events');
    }

    async delaySystemEvent(type: string, delay: number, data = {}) {
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

    async clearDelayedSystemEvent(type: string) {
        await emitBgEvent.clearDelayedEvent(this._id, type);
    }

    async makeOnline(connectionId: string) {
        const query = {
            $addToSet: { activeSocketSessions: connectionId },
            $set: { isOnline: true }
        };

        const wasOffline = this.isOnline !== true;

        await this.updateOne(query);

        this.set({ isOnline: true });

        return wasOffline;
    }

    async tryToMakeOffline(connectionId: string) {
        await this.updateOne({ $pull: { activeSocketSessions: connectionId } });

        const haveConnections = await this.model()
            .findOne({
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

const UserSchema = new MagicSchema(
    {
        createdAt: {
            type: Number,
            description: 'Дата создания',
            default: null
        },
        _catalogId: {
            type: MagicSchema.Types.ObjectId,
            description: 'Идентификатор корневого каталога',
            default: null,
            protected: true
        },
        _fsId: {
            type: MagicSchema.Types.ObjectId,
            description: 'ID личного файлового хранилища',
            default: null,
            ref: 'fs',
            protected: true,
            private: true
        }
    },
    {
        _id: true,
        id: false
    }
);

const PublicObjectOptions: PublicObjectOptions = {
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

UserSchema.plugin(ProfileWithAccess, {});
UserSchema.plugin<IWithEmailOptions>(WithEmail, {});

UserSchema.plugin(ProfileWithToken, {
    requestQuotaInterval: 900,
    requestQuotaNumber: 1000
});

UserSchema.plugin(PublicObject, PublicObjectOptions);
UserSchema.plugin(AccountPlugin, {});

UserSchema.loadClass(UserClass, false);

UserSchema.onModelEvent('instance-post-create', async (profile, instance) => {
    await emitBgEvent.sendEvent('createUserFs', {
        _profileId: instance._id
    }, 'media-events');
});

export default UserSchema.model('user', 'users');

export { UserSchema };
export type TUser = UserClass &
    TProfileWithAccess &
    TWithEmail &
    TProfileWithToken &
    TPublicObject &
    TAccountPlugin &
    MagicDocument;
export type TUserStatic = typeof UserClass &
    TProfileWithAccessStatic &
    TWithEmailStatic &
    TProfileWithTokenStatic &
    TPublicObjectStatic &
    TAccountPluginStatic;
