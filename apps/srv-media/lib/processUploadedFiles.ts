import { clear } from '@srvMedia/lib/utils/tmpFile';
import { IMG_PROC } from '@srvMedia/lib/constants';
import { detectImageMeta } from '@srvMedia/lib/imageOperations';
import { ValidationError } from '@lib/errors';
import emitBgEvent from '@dbLib/emitBgEvent';
import { getSuitableSizes } from '@srvMedia/lib/imageOperations/sizeSchemas';
import { createBasePreview } from '@srvMedia/lib/imageOperations/baseImages';

const buildTasks = async (action, container, systemName, meta, baseName) => {
    const sizeList = getSuitableSizes(action, meta.dimensions.original);

    return sizeList.length > 0
        ? emitBgEvent.sendEvent(action, {
            file: { systemName, type: meta.type, dimensions: meta.dimensions },
            container,
            sizeList,
            baseName
        }, 'resize_processing')
        : null;
};

const processUploadedFiles = async (container, { files, fields = {} }, actions) => {
    if (!files.every(file => file !== null)) {
        throw new ValidationError('unsupported file type');
    }

    const fieldsList = Object.keys(fields);

    return {
        files: await Promise.all(files.map(async ({ meta, systemName }, index) => {
            const fileMeta = meta;

            if (meta.image) {
                const blobName = `prebuild.${systemName}`;

                if (!meta.dimensions) {
                    Object.assign(fileMeta, await detectImageMeta(open(blobName), meta.type));
                }

                if (actions.includes(IMG_PROC.PREVIEW)) {
                    // await buildTasks(
                    //     IMG_PROC.PREVIEW,
                    //     container,
                    //     systemName,
                    //     fileMeta,
                    //     await createBasePreview(systemName, fileMeta, container)
                    // );
                }

                await clear(blobName);
            }

            return { meta: fileMeta, systemName };
        })),
        fields
    };
};

export default processUploadedFiles;
