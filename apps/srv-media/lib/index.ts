import { filestore as config } from 'config';

import MTSceph from '@srvMedia/lib/integration/MTSceph';
import loggerRaw from '@lib/logger';
import contentDisposition from 'content-disposition';
import pipe from '@srvMedia/lib/utils/streamPipe';
import { write } from '@srvMedia/lib/utils/tmpFile';
import * as fs from 'fs';
import { PassThrough } from 'stream';

const logger = loggerRaw('MEDIA INTERFACE');

const storagesList = new Map([
    [
        MTSceph.name,
        new MTSceph(
            config.providers.mts.id,
            config.providers.mts.secret,
            config.providers.mts.logging
        )
    ]
]);

const storage = storagesList.get(config.storage);

const getFileUrl = (container, systemName, meta, download = false, expire = null) => {
    const fileUrl = storage.getFile(container, systemName, {
        contentType: meta.type,
        contentDisposition: contentDisposition(
            meta.filename || 'file',
            {
                type: download
                    ? 'attachment'
                    : 'inline'
            }
        )
    }, expire);

    logger.debug('blob download link %s', fileUrl);

    return fileUrl;
};

const getContainer = container => (systemName, stream) => {
    if (process.env.NODE_ENV === 'test') {
        const mockedStream = new PassThrough();

        stream.pipe(mockedStream);

        mockedStream.end();
        mockedStream.destroy();

        return new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('finish', resolve);
        });
    }

    return storage.saveFile(container, systemName, stream);
};

const copyImageBlob = async (sourceContainer, sourceBlobName, targetContainer, targetBlobName) => {
    const keepSameSource = sourceContainer === targetContainer && sourceBlobName === targetBlobName;

    logger.debug('copyImageBlob %j', {
        sourceContainer,
        sourceBlobName,
        targetContainer,
        targetBlobName,
        keepSameSource
    });

    const sourceStream = await storage.streamFile(sourceContainer, sourceBlobName);

    await Promise.all([
        pipe(sourceStream, write(`prebuild.${targetBlobName}`)),
        storage.copyFile(sourceContainer, sourceBlobName, targetContainer, targetBlobName)
    ]);

    return !keepSameSource;
};

const saveLocal = async (container, sourceName, targetName) => pipe(
    await storage.streamFile(container, sourceName),
    write(targetName)
);

export {
    getFileUrl,
    getContainer,
    copyImageBlob,
    saveLocal,
    storage
};
