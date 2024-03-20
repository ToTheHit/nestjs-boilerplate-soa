import { resizeImage } from '@srvMedia/lib/imageOperations/index';
import { IMG_PROC, MAX_DIMENSIONS } from '@srvMedia/lib/constants';
import { basePreviewNameBuild } from '@srvMedia/lib/utils/blobNameBuilder';

const createBasePreview = (systemName, meta, container) => {
    const baseName = basePreviewNameBuild(systemName);
    const baseStream = open(`prebuild.${systemName}`);
    const stream = resizeImage(
        baseStream,
        IMG_PROC.PREVIEW,
        MAX_DIMENSIONS,
        meta.type
    );

    return null;
    // return storage.saveFile(container, baseName, stream)
    //     .then(() => {
    //         baseStream.destroy();
    //
    //         return baseName;
    //     });
};

export {
    createBasePreview
};
