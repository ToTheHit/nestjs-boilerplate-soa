import { IMG_PROC, MAX_DIMENSIONS } from '@srvMedia/lib/constants';

const blobNameSizeBuild = (blobName, action, { width, height }) => (
    `${blobName}_rs1_${action}_${width}x${height}`
);

const basePreviewNameBuild = blobName => blobNameSizeBuild(blobName, IMG_PROC.PREVIEW, MAX_DIMENSIONS);

export {
    basePreviewNameBuild
};
