import { filestore as config } from 'config';
import * as mime from 'mime-types';

const extractExtFromFileName = fileName => {
    if (fileName && fileName.indexOf('.') > 0) {
        const [ext] = fileName.split('.').reverse();

        return ext;
    }

    return null;
};

const extractTextMimetype = fileNameExtension => {
    const mimetype = mime.lookup(fileNameExtension);
    const isTextMimetype = mimetype && mimetype.includes('text/');

    return isTextMimetype ? mimetype : null;
};

const imageOverride = [];
const audioOverride = [];
const videoOverride = ['application/vnd.rn-realmedia', 'model/vnd.mts'];

const checkExceptions = (type, ext) => {
    const fileOverride = {
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ext,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ext
    };

    if (type === 'application/xml' && ext === 'svg') {
        return 'svg';
    }
    if (fileOverride[type]) {
        return fileOverride[type];
    }
    if (type === 'application/zip' && ext === 'numbers') {
        return 'numbers';
    }

    return null;
};

type TFileInfoNormalize = {
    type: string,
    ext: string,
    filename: string,
    media: {
        previewEnabled: boolean,
        image: boolean,
        audio: boolean,
        video: boolean
    }
}
const fileInfoNormalize = (fileTypeDetected: string, fileNameRaw: string, fileExtRaw: string): TFileInfoNormalize => {
    const fileNameExtension = extractExtFromFileName(fileNameRaw) || fileExtRaw;
    const type = fileTypeDetected || extractTextMimetype(fileNameExtension) || 'application/octet-stream';

    const ext = checkExceptions(type, fileNameExtension) || mime.extension(type) || fileNameExtension;

    let filename: string | string[] = fileNameRaw;

    if (fileNameRaw) {
        filename = fileNameRaw.split('.');

        if (filename[filename.length - 1] !== ext) {
            filename[filename.length - 1] = ext;
        }

        filename = filename.join('.');
    }

    return {
        type,
        ext,
        filename,
        media: {
            previewEnabled: (/^image\/*/i.test(type) && config.allowedImgMimes.includes(type)),
            image: imageOverride.includes(type) ||
                (/^image\/*/i.test(type) && config.allowedImgMimes.includes(type)),
            audio: audioOverride.includes(type) || /^audio\/*/i.test(type),
            video: videoOverride.includes(type) || /^video\/*/i.test(type)
        }
    };
};

export default fileInfoNormalize;
