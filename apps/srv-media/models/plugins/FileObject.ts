import { filestore } from 'config';

import MagicSchema from '@models/MagicSchema';
import MagicModel from '@models/MagicModel';

const defaults = Symbol('defaults');

export interface IFileObjectOptions {
    container: 'files' | 'avatars';
}
type TMeta = {
    type: string;
    filename: string;
    hash: string;
    size: number;
    processedBlob: {[key: string]: string}
}

class FileObjectClass extends MagicModel {
    static fileTypeClientFormatter(fileType: string) {
        const defaultMime = 'application/octet-stream';

        return !<string[]>(filestore.allowedMimes).includes(fileType)
            ? defaultMime
            : fileType;
    }

    static container() {
        return this.schema[defaults].container;
    }

    container() {
        return (<typeof FileObjectClass> this.constructor).container();
    }

    static normalizeUploadData({ systemName, meta }: {systemName: string, meta: TMeta}) {
        return {
            _sourceOriginalName: systemName,
            meta,
            type: meta.type,
            title: meta.filename,
            hash: meta.hash,
            size: meta.size
        };
    }

    getImgMetaReSizeExist(size: number, type: string) {
        if (!(<TMeta> this.meta).processedBlob) {
            return false;
        }

        const value = (<TMeta> this.meta).processedBlob[`${size}_${type}`];

        return typeof value === 'undefined'
            ? false
            : value;
    }

    async setImgMetaReSizeExist(size: number, type: string, blobName: string) {
        await this.updateOne({
            $set: { [`meta.processedBlob.${size}_${type}`]: blobName }
        });
    }
}

const FileObject = (schema: MagicSchema, options: IFileObjectOptions) => {
    schema[defaults] = options;

    schema.add({
        _sourceOriginalName: {
            type: String,
            description: 'Имя объекта в S3',
            default: null,
            public: true,
            private: { methodToAllow: 'create' },
            protected: { methodToAllow: 'create' }
        },
        size: {
            type: Number,
            description: 'Размер файла в байтах',
            min: 0,
            default: 0,
            public: true,
            protected: { methodToAllow: 'create' },
            in_filter: true
        },
        type: {
            type: String,
            description: 'Тип файла, обычно - расширение загружаемого.',
            public: true,
            protected: { methodToAllow: 'create' }
        },
        hash: {
            type: String,
            description: 'MD5 хэш файла',
            public: true,
            protected: { methodToAllow: 'create' }
        },
        meta: {
            type: MagicSchema.Types.Mixed,
            public: true,
            default: null,
            private: { methodToAllow: 'create' },
            protected: { methodToAllow: 'create' }
        }
    });

    schema.loadClass(FileObjectClass);

    schema.onModelEvent('instance-pre-save', async function (profile, instance, rawData) {
        if (instance.isNewObject()) {
            instance.set({
                type: rawData.type,
                size: rawData.size,
                meta: rawData.meta,
                hash: rawData.hash,
                _sourceOriginalName: rawData._sourceOriginalName
            });
        } else {
            instance.set('meta.filename', instance.title);
            instance.markModified('meta');
        }
    });
};

export default FileObject;
export type TFileObject = FileObjectClass;
export type TFileObjectStatic = typeof FileObjectClass
