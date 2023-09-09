import MagicSchema from '../MagicSchema';
import MagicModel from '../MagicModel';
import memo from '../../../lib/utils/memo';
import { AccessDenied } from '../../../lib/errors';
import { TMethod } from '../../lib/constants';

const defaults = Symbol('defaults');

const getAdminRightsFn = async (profile, rightKey) => {
    return true;
};

const getAccessRightsFn = async profile => {
    return [];
};

const getAdminRights = memo(getAdminRightsFn, 'profile getAdminRights');
const getAccessRights = memo(getAccessRightsFn, 'profile getAccessRights');

class ProfileWithAccessClass extends MagicModel {
    async checkAccessRights(instance: any, method: TMethod, throwError = true) {
        if (typeof this.model().schema[defaults].checkAccessRights === 'function') {
            return this.model().schema[defaults].checkAccessRights.call(this, instance, method, throwError);
        }

        const accessResult = await instance.checkAccessToMethod(this, method);

        if (!accessResult && throwError === true) {
            const modelPublicName = instance.model().getPublicName();

            throw new AccessDenied(`method ${method} denied for this instance of ${modelPublicName}`, {
                _objectId: instance._id,
                rightsWelder: this._id,
                rightsWelderType: this.model().getPublicName()
            });
        }

        return accessResult;
    }

    async checkAdminRights(rightKey: string, throwError = false) {
        return this.isAdmin;
        const allowed = this.is('WithAdminRights')
            ? await getAdminRights(this, rightKey)
            : false;

        if (!allowed && throwError) {
            throw new AccessDenied('no admin rights', {
                rightsNeed: Array.from(new Set([rightKey, 'manage']))
            });
        }

        return allowed;
    }

    async getAccessRightsIds() {
        return this.rightsAccess;
    }

    async getProfileAccessRightsList() {
        return getAccessRights(this);
    }
}
const ProfileWithAccess = (schema: MagicSchema, options = {}) => {
    // eslint-disable-next-line no-param-reassign
    schema[defaults] = {
        checkAccessRights: null,
        ...options
    };

    schema.loadClass(ProfileWithAccessClass, false);
};

export default ProfileWithAccess;
export type TProfileWithAccess = ProfileWithAccessClass;
export type TProfileWithAccessStatic = typeof ProfileWithAccessClass;
