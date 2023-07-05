import memo from '../../../../lib/utils/memo';
import { AccessDenied } from '../../../../lib/errors';
import { reduceToObject } from '../../../../lib/utils/fn';
import { ACCESS } from '../../../lib/constants';
import MagicSchema, { TMagicSchema, TMagicSchemaStatic } from '../../MagicSchema';
import isDeleted from '../../../lib/isDeleted';
import { TPublicInterfaceStatic } from './PublicInterface';
import { TMagicObject } from '../MagicObject';
import { IGetterQuery } from '../../../../lib/interface';
import EmployeeRelatedFields from '../EmployeeRelatedFields';
import MagicModel from '../../MagicModel';

const defaults = Symbol('defaults');

const getProfileRightsFn = (profile, Model, instance) => Model.schema[defaults].getAccessRights.call(Model, profile, Model.schema[defaults].rightsBuilder, instance);

const accessQueryBuilderFn = async (profile, Model, method, baseObject) => {
    const rights = await Model.getRightsObject(profile);

    return Model.schema[defaults].queryModifier.call(Model, profile, rights, method, baseObject);
};

const getProfileRights = memo(getProfileRightsFn, 'Model getProfileRights');
const accessQueryBuilder = memo(accessQueryBuilderFn, 'Model buildAccessQuery');

class CheckAccessRightsClass extends MagicModel {
    static getRightsFieldName() {
        return this.schema[defaults].rightsField || this.collection.name;
    }

    static async getRightsObject(profile, object, method) {
        if (!profile) {
            return {};
        }

        if (method === 'create') {
            return getProfileRightsFn(profile, this, object);
        }

        return getProfileRights(profile, this, object);
    }

    static async buildAccessQuery(profile, method, baseObject = null) {
        return accessQueryBuilder(profile, this, method, baseObject);
    }

    static targetType() {
        return this.schema[defaults].targetProfile.toLowerCase();
    }

    static async getObjectsIdsWithRightsIgnore(
        profile,
        objectsIdsList,
        getNotAllowedObjects = false,
        ignoreDeletion = false,
        queryModif = {}
    ) {
        const result = [];

        try {
            const resultRawAllowed = await (<TPublicInterfaceStatic><unknown> this).getObjectsListByIds(
                profile,
                objectsIdsList,
                {},
                queryModif,
                null,
                false,
                true,
                ignoreDeletion,
                'read'
            );

            for (const { _id } of resultRawAllowed) {
                result.push(_id);
            }
        } catch (e) {
            if (!(e instanceof AccessDenied)) {
                throw e;
            }
        }

        if (getNotAllowedObjects) {
            const resultRawNotAllowed = await this.find({
                ...queryModif,
                ...isDeleted(this, ignoreDeletion),
                _id: {
                    $in: objectsIdsList,
                    $nin: result
                }
            })
                .select('_id')
                .lean();

            for (const { _id } of resultRawNotAllowed) {
                result.push(_id);
            }
        }

        return result;
    }

    static async getObjectsListWithRightsIgnore(
        profile,
        objectsIdsList,
        baseObject = null,
        getNotAllowedObjects = false,
        ignoreDeletion = false,
        calculateParticipantsForLink = false,
        queryModif = {},
        skipInner = true,
        fields = []
    ) {
        const result = [];
        const allowedObjects = [];
        const collectionNameMeta = (<TMagicObject><unknown> this).getPublicName();
        const collectionName = this.collection.name;

        try {
            const resultRawAllowed = await (<TPublicInterfaceStatic><unknown> this).getObjectsListByIds(
                profile,
                objectsIdsList,
                {},
                queryModif,
                baseObject,
                false,
                true,
                ignoreDeletion,
                'read'
            );
            const objectsAllowed = await (<TPublicInterfaceStatic><unknown> this).getObjectsInfoPublic(
                profile,
                resultRawAllowed,
                baseObject,
                {
                    skipInner,
                    fields
                }
            );

            for (const object of objectsAllowed) {
                allowedObjects.push(object._id);
                result.push({
                    collectionName,
                    access: true,
                    meta: {
                        ...object,
                        collectionName: object.collectionName || collectionNameMeta
                    }
                });
            }
        } catch (e) {
            if (!(e instanceof AccessDenied)) {
                throw e;
            }
        }

        if (getNotAllowedObjects) {
            const resultRawNotAllowed = await this.find({
                ...isDeleted(this, ignoreDeletion),
                ...queryModif,
                _id: {
                    $in: objectsIdsList,
                    $nin: allowedObjects
                }
            });

            if (resultRawNotAllowed.length > 0) {
                const objectsNotAllowed = await (<TPublicInterfaceStatic><unknown> this).getObjectsInfoPublic(
                    profile,
                    resultRawNotAllowed,
                    baseObject,
                    {
                        skipInner,
                        fields
                    }
                );

                for (const object of objectsNotAllowed) {
                    const customData = {};

                    if ((<TMagicSchemaStatic><unknown> this).is('ObjectUnderQuota')) {
                        Object.assign(customData, { overRate: object.overRate });
                    }

                    result.push({
                        collectionName,
                        access: false,
                        meta: Object.assign(object, customData)
                    });
                }
            }
        }

        return result;
    }

    async getPermittedProfiles(idsOnly = false, customData = {}, _wsId = null) {
        const profiles = await this.getPermittedProfilesByIds(
            await this.schema[defaults].getPermittedProfiles.call(this, customData),
            _wsId
        );

        return idsOnly ? profiles.map(({ _id }) => _id) : profiles;
    }

    async checkAccessToMethod(profile, method) {
        const rights = await (<CheckAccessRightsClass><unknown> this.constructor).getRightsObject(profile, this, method);

        return (<CheckAccessRightsClass><unknown> this.constructor).schema[defaults].accessChecker.call(
            this,
            profile,
            rights,
            method
        );
    }

    async getPermittedProfilesByIds(profilesIds, _wsId = null) {
        if (profilesIds.length === 0) {
            return [];
        }

        const targetProfile = (<CheckAccessRightsClass><unknown> this.constructor).targetType();
        const query: IGetterQuery = { _id: { $in: profilesIds } };

        if (targetProfile === 'employee') {
            query._user = { $ne: null };
        }

        if ((<TMagicSchema><unknown> this).is('WsId') && _wsId) {
            query._wsId = _wsId;
        }

        if (this.is('WsCollectionObject')) {
            query.accessType = { $ne: 'guest' };
        }

        const ids = await MagicSchema.model(targetProfile).find(query).select('_id').lean();

        return ids.map(({ _id }) => _id);
    }
}

async function getAccessRightsDefaults(profile, rightsBuilder) {
    const rightsField = this.getRightsFieldName();
    const rightsList = await profile.getProfileAccessRightsList();

    return reduceToObject(
        rightsList,
        (result, right) => {
            if (right[rightsField]) {
                rightsBuilder(result, right[rightsField]);
            }

            return result;
        },
        { rights: {} }
    );
}

export interface IOptions {
  getPermittedProfiles?: () => Promise<any>;
  accessChecker?: (employee: any, rightsObject: any, method: string) => Promise<boolean>;
  queryModifier?: (employee, rightsObject, baseObject) => any;
  getAccessRights?: () => any;
  rightsBuilder?: (result, rights) => any;
  fieldALLOWED?: {
      getInstance?: (profile, answer, instance, fieldsToGet) => Promise<{allowed: string}>;
      getStatic?: (profile, answer, objectsList, fieldsToGet, baseObject) =>
        Promise<{[key: string]: {allowed: string}}>;
  };
  rightsField?: string;
  targetProfile?: 'employee' | 'user';
  checkAccessToCreate?: boolean;
}
function CheckAccessRights(schema, options: IOptions = {}) {
    const {
        getPermittedProfiles = async () => [],
        accessChecker = async (employee, rightsObject, method) => true,
        queryModifier = async (employee, rightsObject, baseObject) => ({}),
        getAccessRights = getAccessRightsDefaults,
        rightsBuilder = () => null,
        fieldALLOWED = null,
        rightsField = null,
        targetProfile = 'employee',
        checkAccessToCreate = true
    } = options;

    // eslint-disable-next-line no-param-reassign
    schema[defaults] = {
        targetProfile,
        rightsField,
        getPermittedProfiles,
        accessChecker,
        queryModifier,
        getAccessRights,
        rightsBuilder
    };

    const allowed = typeof fieldALLOWED === 'string' ? fieldALLOWED : ACCESS.ACT_READ;

    const allowedDefaultHandler = {
        async getInstance() {
            return { allowed };
        },
        async getStatic(profile, objectsList) {
            const result = {};

            for (const { _id } of objectsList) {
                result[_id] = { allowed };
            }

            return result;
        }
    };

    schema.plugin(EmployeeRelatedFields, {
        fields: {
            allowed: {
                type: String,
                default: ACCESS.ACT_READ,
                enum: [
                    ACCESS.ACT_NONE,
                    ACCESS.ACT_READ,
                    ACCESS.ACT_READ_UPDATE,
                    ACCESS.ACT_READ_UPDATE_ARCHIVE,
                    ACCESS.ACT_READ_UPDATE_DELETE,
                    ACCESS.ACT_READ_UPDATE_ARCHIVE_DELETE
                ],
                protected: true
            }
        },
        handler: typeof fieldALLOWED === 'object' && fieldALLOWED ? fieldALLOWED : allowedDefaultHandler
    });

    schema.loadClass(CheckAccessRightsClass);

    schema.onModelEvent('instance-validate', (profile, instance) => {
        if (instance.isNewObject()) {
            return checkAccessToCreate ? profile.checkAccessRights(instance, 'create') : null;
        }

        return profile.checkAccessRights(instance, 'update');
    });
}

export type TCheckAccessRights = CheckAccessRightsClass;
export type TCheckAccessRightsStatic = typeof CheckAccessRightsClass;

export default CheckAccessRights;
