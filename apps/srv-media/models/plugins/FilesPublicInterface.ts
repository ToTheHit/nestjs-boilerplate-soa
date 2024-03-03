import MagicSchema from '@models/MagicSchema';
import PublicObject, { PublicObjectOptions, TPublicObject, TPublicObjectStatic } from '@plugins/PublicObject';
import { applyRightEntry, TMethod } from '@dbLib/constants';
import { reduceToObject } from '@lib/utils/fn';

function rightsBuilder(result, right) {
    // TODO: заменить access_private_fs на установку стандартных значений прав для ФХ сотрудника. Дальше будет проще проверять
    result.access_private_fs = result.access_private_fs || right.access_private_fs;

    if (!result.rights) {
        result.rights = {};
    }

    for (const _fsId of right._fsId) {
        if (!result.rights[`${_fsId}`]) {
            result.rights[`${_fsId}`] = {};
        }

        result.rights[`${_fsId}`] = applyRightEntry(
            result.rights[`${_fsId}`],
            Object.assign(
                right.allowed,
                { create: right.allowed_create }
            )
        );
    }

    return result;
}

async function getPermittedProfiles() {
    // К файлам и папкам имеют доступ те, кто имеет доступ к ФХ
    const FileStorage = MagicSchema.model('fs');

    if (!(this instanceof FileStorage)) {
        const fs = await FileStorage.findById(this._fsId);

        return fs.getPermittedProfiles(true);
    }

    const isPrivateFs = this._employeeId !== null;
    const employeesIdsList = [];

    const Employee = MagicSchema.model('employee');
    const AdminRight = MagicSchema.model('admin_right');
    const AccessRights = MagicSchema.model('access_right');

    employeesIdsList.push(...(await AdminRight.getEmployeesWithRight(
        [this._wsId],
        await AdminRight.getSpecificAdminRights(this._wsId, true, isPrivateFs
            ? 'manage_private_fs'
            : 'manage_fs')
    )));

    const rightsToGet = [];

    if (isPrivateFs) {
        // Если ФХ пренадлежит сотруднику, то он имеет права на ФХ, если у него есть права
        const employee = await Employee.findById(this._employeeId);

        if (employee && await employee.checkAccessRights(this, 'read', false)) {
            employeesIdsList.push(employee._id);
        }
    } else {
        // Иначе для общего ФХ нужно проверять права сотрудников
        const employeesRights = await AccessRights.getSpecificAccessRights(this._wsId, 'files');

        for (const { _id, files } of employeesRights) {
            for (const _fsId of files._fsId) {
                if (this._id.equals(_fsId) && files.allowed) {
                    rightsToGet.push(_id);
                }
            }
        }

        if (rightsToGet.length > 0) {
            employeesIdsList.push(...(await AccessRights.getEmployeesWithRight(
                [this._wsId],
                rightsToGet
            )));
        }
    }

    return employeesIdsList;
}

async function accessChecker(profile, rights, method, ignoreOverRate = false) {
    // объект можно просматривать, архивировать или удалить
    const isOverRated = !ignoreOverRate &&
        this.constructor.is('ObjectUnderQuota') &&
        this.overRate &&
        !['delete', 'archive', 'read'].includes(method);

    if (isOverRated) {
        return false;
    }

    const FileStorage = MagicSchema.model('fs');
    const Catalog = MagicSchema.model('catalog');

    const fs = this instanceof FileStorage
        ? this
        : await FileStorage.findById(this._fsId);

    // С корневым каталогом и каталогом для загрузки ничего сделать не можем
    if (this instanceof Catalog &&
        method !== 'read' &&
        (this._id.equals(fs.rootCatalogId) || this.downloads)) {
        return false;
    }

    const isAdminPrivateFs = await profile.checkAdminRights('manage_private_fs');
    const isAdminFs = await profile.checkAdminRights('manage_fs');

    if (this instanceof FileStorage) { // Если мы запросили ФХ
        return FileStorage.isFsActionPermitted(profile, fs, rights, isAdminFs, isAdminPrivateFs, method);
    }

    return method === 'create'
        ? FileStorage.isObjectUploadPermitted(profile, fs, rights, isAdminFs, isAdminPrivateFs)
        : FileStorage.isObjectActionPermitted(profile, fs, rights, isAdminFs, isAdminPrivateFs, method);
}

function allowedFieldFs(storageOwner, fs, rights, isAdminPrivateFs, isAdminFs) {
    // админ может удалить личные фх удаленных сотрудников
    if (fs._employeeId && isAdminPrivateFs && !storageOwner) {
        return { read: true, delete: true };
    }

    return isAdminFs && !fs._employeeId
        ? { read: true, update: true, delete: true }
        : { read: true };
}

function allowedFieldFsObject(employee, Model, object, fs, rights, isAdminPrivateFs, isAdminFs) {
    if (!fs) {
        return { };
    }

    const fullAccess = (!fs._employeeId && isAdminFs) ||
        (fs._employeeId && (isAdminPrivateFs || (rights.access_private_fs && employee._id.equals(fs._employeeId))));

    return fullAccess
        ? { read: true, update: true, delete: true }
        : rights.rights[`${fs._id}`];
}

export type FilesPublicInterfaceOptions = {
    queryModifier: (employee, rights, method: TMethod, baseObject) => Promise<unknown> | Promise<Record<string, never>>,
} & PublicObjectOptions;

function FilesPublicInterface(schema: MagicSchema, options: FilesPublicInterfaceOptions) {
    schema.plugin(PublicObject, {
        ...options,
        rightsBuilder,
        accessChecker,
        getPermittedProfiles,
        rightsField: 'files',
        queryModifier: options.queryModifier,
        fieldALLOWED: {
            async getInstance(profile) {
                const FileStorage = MagicSchema.model('fs');
                const Employee = MagicSchema.model('employee');

                const [isAdminPrivateFs, isAdminFs, rights] = await FileStorage.getPermissions(profile);

                if (this instanceof FileStorage) {
                    const storageOwner = this._employeeId && (await Employee.countDocuments({
                        _id: this._employeeId
                    })) > 0;

                    return {
                        allowed: allowedFieldFs(storageOwner, this, rights, isAdminPrivateFs, isAdminFs)
                    };
                }

                const fs = await FileStorage.findById(this._fsId);

                return {
                    allowed: allowedFieldFsObject(
                        profile,
                        this.constructor,
                        this,
                        fs,
                        rights,
                        isAdminPrivateFs,
                        isAdminFs
                    )
                };
            },
            async getStatic(profile, objectsList) {
                const FileStorage = MagicSchema.model('fs');
                const Employee = MagicSchema.model('employee');

                const [isAdminPrivateFs, isAdminFs, rights] = await FileStorage.getPermissions(profile);

                if (this === FileStorage) {
                    const employeeIds = objectsList.reduce((result, { _employeeId }) => (_employeeId
                        ? result.concat(_employeeId)
                        : result), []);
                    const ownersList = reduceToObject(
                        await Employee.findByIdsList(employeeIds, false, '_fsId'),
                        (result, employee) => {
                            result[employee._fsId] = true;

                            return result;
                        }
                    );

                    return reduceToObject(
                        objectsList,
                        (result, fs) => {
                            const storageOwner = ownersList[fs._id];

                            result[fs._id] = {
                                allowed: allowedFieldFs(storageOwner, fs, rights, isAdminPrivateFs, isAdminFs)
                            };

                            return result;
                        }
                    );
                }

                const fsMap = reduceToObject(
                    await FileStorage.findByIdsList(objectsList.map(({ _fsId }) => _fsId), false, '_id', '_employeeId'),
                    (result, fs) => {
                        result[fs._id] = fs;

                        return result;
                    }
                );

                return reduceToObject(objectsList, (result, object) => {
                    result[object._id] = {
                        allowed: allowedFieldFsObject(
                            profile,
                            this,
                            object,
                            fsMap[object._fsId],
                            rights,
                            isAdminPrivateFs,
                            isAdminFs
                        )
                    };

                    return result;
                });
            }
        }
    });
}

export default FilesPublicInterface;
export type TFilesPublicInterface = TPublicObject;
export type TFilesPublicInterfaceStatic = TPublicObjectStatic;
