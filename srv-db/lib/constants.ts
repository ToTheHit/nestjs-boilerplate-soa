const ACCESS = {
    ACT_NONE: 'none',
    ACT_READ: 'read',
    ACT_DELETE: 'delete',
    ACT_ARCHIVE: 'archive',
    ACT_READ_UPDATE: 'read_update',
    ACT_READ_UPDATE_DELETE: 'read_update_delete',
    ACT_READ_UPDATE_ARCHIVE: 'read_update_archive',
    ACT_READ_UPDATE_ARCHIVE_DELETE: 'read_update_archive_delete',
    ACT_READ_DELETE: 'read_delete',
    ACT_READ_ARCHIVE: 'read_archive',
    ACT_READ_ARCHIVE_DELETE: 'read_archive_delete',
    COMISS: 'commiss',
    NONCOMISS: 'non_commiss',
    ANY: 'any',
    NONE: 'none'
};

const anyMark = Symbol('any-marks');
const noMarks = Symbol('no-marks');
const noMarks_denied = Symbol('no-marks-denied');

const initWs = new WeakSet();
const ignoreCustomFieldValue = new WeakSet();
const groupCache = new WeakMap();
const authorOverride = new WeakMap();
const autoTitleCache = new WeakMap();

const parsePermissionString = (strRaw = null, overrideValues = {}) => {
    const str = typeof strRaw === 'string' ? strRaw.split('_') : [];

    return {
        read: str.includes('read'),
        create: str.includes('update') || str.includes('create'),
        update: str.includes('update'),
        restore: str.includes('update'),
        archive: str.includes('archive'),
        delete: str.includes('delete'),
        ...overrideValues
    };
};

const applyRightEntry = (base, entry) => ({
    read: base.read || entry.read,
    create: base.create || entry.create,
    update: base.update || entry.update,
    restore: base.restore || entry.restore,
    archive: base.archive || entry.archive,
    delete: base.delete || entry.delete
});

const transformToPermissionString = entry => {
    const list = [];

    if (entry) {
        if (entry.read) {
            list.push('read');
        }

        if (entry.create || entry.update) {
            list.push('update');
        }

        if (entry.archive) {
            list.push('archive');
        }

        if (entry.delete) {
            list.push('delete');
        }
    }

    return list.length > 0 ? list.join('_') : 'none';
};

const INIT_LIST_LIMIT = 100;

export {
    ACCESS,
    anyMark,
    noMarks,
    noMarks_denied,
    initWs,
    authorOverride,
    ignoreCustomFieldValue,
    parsePermissionString,
    applyRightEntry,
    transformToPermissionString,
    groupCache,
    autoTitleCache,
    INIT_LIST_LIMIT
};

export type TMethod = 'read' | 'create' | 'update' | 'delete';
