import * as sharp from 'sharp';
import { IMG_PROC } from '@srvMedia/lib/constants';

const sharpWrap = (img, options = {}) => img.jpeg({
    progressive: true,
    ...options
});

const autoOrientSharp = stream => {
    const through = sharp({ failOnError: false }).rotate();

    stream.pipe(through);

    return through;
};

const handlerSharp = (stream, handler, options) => {
    const through = sharp({ failOnError: false }).rotate();

    stream.pipe(through);

    return sharpWrap(handler(through), options);
};

const resizeSharp = (sourceStream, { width, height }, action) => handlerSharp(sourceStream, img => img
    .flatten({
        background: {
            r: 255,
            g: 255,
            b: 255,
            alpha: 1
        }
    })
    .resize({
        width,
        height,
        withoutEnlargement: true,
        fit: action === IMG_PROC.AVATAR
            ? 'cover'
            : 'inside'
    }), {
    quality: 100,
    optimiseScans: true,
    overshootDeringing: true,
    chromaSubsampling: '4:4:4'
});

const calculateCropDimensions = (width, height, crop) => {
    const scaleFactorCrop = width > height
        ? width / crop.preview_width
        : height / crop.preview_height;

    const canvasWidth = Math.ceil(crop.preview_width * scaleFactorCrop);
    const canvasHeight = Math.ceil(crop.preview_height * scaleFactorCrop);

    const baseCropWidth = Math.ceil(crop.width * scaleFactorCrop);
    const baseCropHeight = Math.ceil(crop.height * scaleFactorCrop);

    const cropStartX = Math.ceil(crop.x * scaleFactorCrop);
    const cropEndX = cropStartX + baseCropWidth;

    const cropStartY = Math.ceil(crop.y * scaleFactorCrop);
    const cropEndY = cropStartY + baseCropHeight;

    const canvasOffsetX = Math.abs(Math.ceil((canvasWidth - width) / 2));
    const canvasOffsetY = Math.abs(Math.ceil((canvasHeight - height) / 2));

    const cropStartNoOffsetX = cropStartX - canvasOffsetX;
    const cropStartNoOffsetY = cropStartY - canvasOffsetY;

    const realCropStartX = Math.max(cropStartNoOffsetX, 0);
    const realCropEndX = Math.min(cropEndX - canvasOffsetX, width);

    const realCropStartY = Math.max(cropStartNoOffsetY, 0);
    const realCropEndY = Math.min(cropEndY - canvasOffsetY, height);

    const realCropWidth = Math.max(realCropEndX - realCropStartX, 0);
    const realCropHeight = Math.max(realCropEndY - realCropStartY, 0);

    const borderLeft = Math.abs(Math.min(cropStartNoOffsetX, 0));
    const borderTop = Math.abs(Math.min(cropStartNoOffsetY, 0));

    return {
        x: realCropStartX,
        y: realCropStartY,
        width: realCropWidth,
        height: realCropHeight,
        border: {
            left: borderLeft,
            top: borderTop,
            right: Math.max(baseCropWidth - borderLeft - realCropWidth, 0),
            bottom: Math.max(baseCropHeight - borderTop - realCropHeight, 0)
        },
        baseCropWidth,
        baseCropHeight
    };
};

const cropSharp = (sourceStream, { width, height }, cropValue) => {
    const crop = calculateCropDimensions(width, height, cropValue);

    if (crop.width > 0 && crop.height > 0) {
        return handlerSharp(sourceStream, img => img
            .flatten({
                background: {
                    r: 255,
                    g: 255,
                    b: 255,
                    alpha: 1
                }
            })
            .extract({
                top: crop.y,
                left: crop.x,
                width: crop.width,
                height: crop.height
            })
            .extend({
                ...crop.border,
                background: {
                    r: 255,
                    g: 255,
                    b: 255,
                    alpha: 1
                }
            }), { quality: 75 });
    }

    return sharpWrap(sharp({
        create: {
            width: crop.baseCropWidth,
            height: crop.baseCropHeight,
            channels: 3,
            background: {
                r: 255,
                g: 255,
                b: 255,
                alpha: 1
            }
        }
    }));
};

const infoSharp = sourceStream => {
    const through = sharp({ failOnError: false });

    sourceStream.pipe(through);

    return through.metadata()
        .then(metadata => {
            const orientation = metadata.orientation || null;

            delete metadata.icc;

            return {
                orientation,
                dimensions: {
                    raw: { width: metadata.width, height: metadata.height }
                },
                metadata: JSON.stringify(metadata)
            };
        });
};

export default {
    resize: resizeSharp,
    crop: cropSharp,
    info: infoSharp,
    autoOrient: autoOrientSharp
};
