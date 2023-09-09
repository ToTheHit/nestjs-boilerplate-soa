import { SchemaType } from 'mongoose';
import { TProfileWithAccess } from '../models/plugins/ProfileWithAccess';
import { TMethod } from './constants';

type TFieldParams = {
    methodToAllow?: Array<TMethod> | TMethod;
    admin?: string;
    allowOnlyForSystem?: boolean;
}

const isAdmin = (profile: TProfileWithAccess, params: TFieldParams): Promise<boolean> => profile.checkAdminRights(params.admin);

const isMethodAllowed = (
    params: TFieldParams,
    method: TMethod
): boolean => (Array.isArray(params.methodToAllow) ? params.methodToAllow : [params.methodToAllow]).includes(method);

const isNotAllowed = async (method: TMethod, profile: TProfileWithAccess, params: TFieldParams): Promise<boolean> => {
    if (typeof params === 'boolean') {
        return params === false;
    }

    if (typeof params === 'object') {
        if (typeof params.methodToAllow === 'string' && typeof params.admin === 'string') {
            return isMethodAllowed(params, method);
        }

        if (typeof params.methodToAllow === 'string') {
            if (params.allowOnlyForSystem) {
                return profile.isSystem;
            }

            return isMethodAllowed(params, method);
        }

        if (typeof params.admin === 'string') {
            return isAdmin(profile, params);
        }
    }

    return true;
};

const securedFieldsList = async (
    schema: {
        [key: string]: SchemaType;
    },
    profile: TProfileWithAccess,
    method: TMethod,
    filterProtected = true,
    filterPrivate = true,
    filterPublic = false
): Promise<string[]> => (
    await Promise.all(
        Object.keys(schema)
            .map(async key => ((filterProtected && !(await isNotAllowed(method, profile, schema[key].options.protected))) ||
            (filterPrivate && !(await isNotAllowed(method, profile, schema[key].options.private))) ||
            (filterPublic && (await isNotAllowed(method, profile, schema[key].options.public)))
                ? key
                : null))
    )
).filter(key => key !== null);

export default securedFieldsList;
