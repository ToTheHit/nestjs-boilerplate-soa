import { ValidationError } from '@lib/errors';
import { IMG_PROC } from '@srvMedia/lib/constants';
import { getResizeSchema } from '@srvMedia/lib/imageOperations/sizeSchemas';
import sharp from './sharp';
import gm from './gm';

const useOrientationFix = new Set(['5', '6', '7', '8', 5, 6, 7, 8]);
const orientationFix = (orientation, baseW, baseH) => (useOrientationFix.has(orientation)
    ? { width: baseH, height: baseW }
    : { width: baseW, height: baseH });

const basicCrop = (width, height) => {
    const shortestSide = width > height ? height : width;

    return {
        width: shortestSide,
        height: shortestSide,
        x: width > height ? Math.ceil((width - shortestSide) / 2) : 0,
        y: height > width ? Math.ceil((height - shortestSide) / 2) : 0,
        preview_width: width,
        preview_height: height
    };
};

// FIXME: Convert values to int before this function
type Crop = {
    width: string;
    height: string;
    x: string;
    y: string;
    preview_width: string;
    preview_height: string;
}
const cropValidation = (cropRaw: Crop) => {
    const cropKeys = ['x', 'y', 'width', 'height', 'preview_width', 'preview_height'];
    const paramKeys = Object.keys(cropRaw);

    if (!cropKeys.every(key => paramKeys.includes(key))) {
        return null;
    }

    const crop = {
        x: parseInt(cropRaw.x, 10),
        y: parseInt(cropRaw.y, 10),
        width: parseInt(cropRaw.width, 10),
        height: parseInt(cropRaw.height, 10),
        preview_width: parseInt(cropRaw.preview_width, 10),
        preview_height: parseInt(cropRaw.preview_height, 10)
    };

    if (Number.isNaN(crop.preview_width) ||
        Number.isNaN(crop.preview_height) ||
        Number.isNaN(crop.width) ||
        Number.isNaN(crop.height) ||
        Number.isNaN(crop.x) ||
        Number.isNaN(crop.y)) {
        throw new ValidationError('invalid crop');
    }

    getResizeSchema(IMG_PROC.PREVIEW, `${crop.preview_width}x${crop.preview_height}`);

    return crop;
};

const getProcessor = type => (!type || type === 'image/bmp' ? gm : sharp);

const cropImage = (sourceStream, { width, height }, crop = null, type) => getProcessor(type)
    .crop(sourceStream, { width, height }, cropValidation(crop) || basicCrop(width, height));

const resizeImage = (sourceStream, action, { width, height }, type) => getProcessor(type)
    .resize(sourceStream, { width, height }, action);

export type TMetadata = {
    orientation: string
    dimensions: {
        raw: {
            width: number
            height: number
        },
        original: {
            width: number
            height: number
        }
    },
    metadata: string
}
const detectImageMeta = (sourceStream, type) => getProcessor(type).info(sourceStream)
    .then((meta: TMetadata) => ({
        ...meta,
        dimensions: {
            ...meta.dimensions,
            original: orientationFix(meta.orientation, meta.dimensions.raw.width, meta.dimensions.raw.height)
        }
    }));

const autoOrient = (sourceStream, type) => getProcessor(type).autoOrient(sourceStream);

export {
    detectImageMeta,
    autoOrient,
    cropImage,
    resizeImage
};
