import mongoose, { SchemaType } from 'mongoose';

const isAdmin = (profile, params): Promise<boolean> => profile.checkAdminRights(params.admin);

const isMethodAllowed = (profile, params, method): boolean =>
  (Array.isArray(params.methodToAllow) ? params.methodToAllow : [params.methodToAllow]).includes(method);

const isNotAllowed = async (method, profile, params): Promise<boolean> => {
  if (typeof params === 'boolean') {
    return params === false;
  }

  if (typeof params === 'object') {
    if (typeof params.methodToAllow === 'string' && typeof params.admin === 'string') {
      return isMethodAllowed(profile, params, method);
      // return isMethodAllowed(profile, params, method) || isAdmin(profile, params);
    }

    if (typeof params.methodToAllow === 'string') {
      if (params.allowOnlyForSystem) {
        return profile.isSystem;
      }

      return isMethodAllowed(profile, params, method);
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
  profile,
  method: 'create' | 'update' | 'delete' | 'read',
  filterProtected = true,
  filterPrivate = true,
  filterPublic = false,
): Promise<string[]> =>
  (
    await Promise.all(
      Object.keys(schema).map(async (key) =>
        (filterProtected && !(await isNotAllowed(method, profile, schema[key].options.protected))) ||
        (filterPrivate && !(await isNotAllowed(method, profile, schema[key].options.private))) ||
        (filterPublic && (await isNotAllowed(method, profile, schema[key].options.public)))
          ? key
          : null,
      ),
    )
  ).filter((key) => key !== null);

export default securedFieldsList;
