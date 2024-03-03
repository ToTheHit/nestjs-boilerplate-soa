// import { fileTypeStream } from 'file-type';
import { filestore as config } from 'config';
import fileInfoNormalize from '@srvMedia/lib/utils/fileInfoNormalize';
import type { Readable as ReadableStream } from 'node:stream';
import importSync from 'import-sync';

const fileType = importSync('file-type');

const detectFileType = async (
    fileStreamRaw: ReadableStream,
    fileNameRaw: string,
    mimetype: string,
    allowedMimes = null
) => {
    const stream = await fileType.fileTypeStream(fileStreamRaw);
    const info = stream.fileType;
    const mime = info?.mime ? info.mime : (mimetype || null);

    const infoNormalized = fileInfoNormalize(
        mime &&
        (!/^.*?\/x-.*?$/i.test(mime) || (allowedMimes === null && config.allowedExceptionMimes.includes(mime)))
            ? mime
            : null,
        fileNameRaw,
        (info && info.ext) || null
    );

    const fileExt = fileNameRaw?.split('.').pop();

    if (['doc', 'ppt', 'xls', 'apk', 'xlsx'].includes(fileExt)) {
        infoNormalized.ext = fileExt;
        infoNormalized.type = mimetype;
        infoNormalized.filename = fileNameRaw;
    }

    return !Array.isArray(allowedMimes) || allowedMimes.includes(infoNormalized.type)
        ? { ...infoNormalized, stream }
        : null;
};

export default detectFileType;
