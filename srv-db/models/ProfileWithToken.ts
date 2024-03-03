import MagicSchema from './MagicSchema';

import sha1 from '../../lib/utils/sha1';
import MagicModel from './MagicModel';
import * as token from '../../lib/utils/token';

const buildSalt = () => sha1(`${Math.random()}.${Date.now()}.${process.pid}`, '');
const requestMetaHolder = new WeakMap();

class ProfileWithTokenClass extends MagicModel {
    getAuthToken(sid: string, ttl: number, misc = {}) {
        return token.sign({
            sid,
            id: `${this._id}`,
            t: this.model().modelName,
            ...misc
        }, this.getSecret(), ttl);
    }

    getSecret() {
        return `${this.salt}${this.sessionVersion}`;
    }

    verifyToken(value) {
        return token.verify(value, this.getSecret());
    }

    updateSalt() {
        this.set({ salt: buildSalt() });
    }

    async resetSessions() {
        const $set = { sessionVersion: Date.now() };

        await this.updateOne({ $set });

        this.set($set);

        return $set.sessionVersion;
    }

    setMeta(requestMeta: any) {
        requestMetaHolder.set(this, requestMeta);
    }

    getMeta() {
        return requestMetaHolder.get(this) || {};
    }

    getPlatform() {
        return this.getMeta().platform;
    }

    async blockUnblock(profile, blockStatus = false, blockReason = '') {
        this.set({
            isBlocked: blockStatus,
            blockReason: blockStatus ? blockReason : '',
            _blockedBy: blockStatus ? profile._id : null
        });

        await this.save();
    }
}
export interface IProfileWithTokenOptions {
    requestQuotaInterval?: number | null;
    requestQuotaNumber?: number | null;
}
const ProfileWithToken = (schema: MagicSchema, options: IProfileWithTokenOptions = {}) => {
    const {
        requestQuotaInterval = null,
        requestQuotaNumber = null
    } = options;

    schema.add({
        salt: {
            type: String,
            required: true,
            private: true,
            default: buildSalt
        },
        sessionVersion: {
            type: Number,
            default: 1,
            private: true
        },
        isBlocked: {
            type: Boolean,
            description: 'Заблокирован ли доступ к системе',
            default: false
        },
        blockReason: {
            type: String,
            description: 'Причина блокировки доступа к системе',
            default: '',
            search: { index: 'filter' }
        },
        _blockedBy: {
            type: MagicSchema.Types.ObjectId,
            ref: 'user',
            default: null
        },
        requestQuotaInterval: {
            type: Number,
            description: 'Причина блокировки доступа к системе',
            default: requestQuotaInterval,
            protected: true
        },
        requestQuotaNumber: {
            type: Number,
            default: requestQuotaNumber,
            protected: true
        }
    });

    schema.loadClass(ProfileWithTokenClass, false);
};

export default ProfileWithToken;
export type TProfileWithToken = ProfileWithTokenClass;
export type TProfileWithTokenStatic = typeof ProfileWithTokenClass;
