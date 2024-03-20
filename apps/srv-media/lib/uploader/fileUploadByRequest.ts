import * as Busboy from 'busboy';
import getFileId from '@srvMedia/lib/utils/buildFileId';
import fileUpload from '@srvMedia/lib/uploader/fileUpload';
import { ValidationError } from '@lib/errors';
import { TFileSaver, TUploadResult } from '@srvMedia/lib/constants';

const fileUploadByRequest = async (
    req,
    fileSaver: TFileSaver,
    limits = {},
    allowedMimes = null
): Promise<TUploadResult> => (
    new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: req.headers
        });

        const requestFields = {};
        const requestFiles = [];

        busboy.on('field', (fieldName, value) => {
            if (!requestFields[fieldName]) {
                requestFields[fieldName] = [];
            }

            requestFields[fieldName].push(value);
        });

        busboy.on('file', async (fieldName, stream, info) => {
            // TODO: manually check count of files and throw error if more than limit

            stream.on('limit', function () {
                req.unpipe(busboy);

                reject(new ValidationError('File size over max limit'));
            });

            requestFiles.push(fileUpload(
                {
                    stream,
                    mimeType: info.mimeType,
                    filename: info.filename
                },
                getFileId('upload', req.profile._id, info.filename),
                fileSaver,
                allowedMimes
            ));
        });

        busboy.on('finish', async () => {
            try {
                resolve({
                    files: await Promise.all(requestFiles),
                    fields: requestFields
                });
            } catch (e) {
                busboy.emit('error', e);
            }
        });

        req.pipe(busboy);
    }));

export default fileUploadByRequest;
