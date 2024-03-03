import detectFileType from '@srvMedia/lib/utils/detectFileType';
import { autoOrient, detectImageMeta } from '@srvMedia/lib/imageOperations';
import hashAndSize from '@srvMedia/lib/utils/hashAndSize';
import pipe from '@srvMedia/lib/utils/streamPipe';
import { write } from '@srvMedia/lib/utils/tmpFile';
import type { Readable as ReadableStream } from 'node:stream';

export type TFileInfo = {
    stream: ReadableStream;
    filename: string;
    mimeType: string;
}
const fileUpload = async (fileInfo: TFileInfo, systemName: string, fileSaver, allowedMimes) => {
    const {
        stream: fileStream,
        filename: filenameRaw,
        mimeType
    } = fileInfo;

    const result = await detectFileType(fileStream, filenameRaw, mimeType, allowedMimes);

    if (!result) {
        return null;
    }

    const {
        stream,
        type,
        ext,
        media,
        filename
    } = result;

    const normalizedStream = media.image && ext !== 'gif'
        ? autoOrient(stream, type)
        : stream;

    const promises = [
        media.image ? detectImageMeta(stream, type) : Promise.resolve({}),
        // hashAndSize(stream),
        fileSaver(systemName, normalizedStream) // Загружаем файл в хранилище
    ];

    if (media.image) {
        promises.push(pipe(normalizedStream, write(`prebuild.${systemName}`)));
    }

    const [meta, info] = await Promise.all(promises);

    // Нормализуем данные файла
    return {
        systemName,
        meta: {
            filename,
            type,
            ext,
            ...media,
            ...info,
            ...meta
        }
    };
};

export default fileUpload;
