import * as magick from 'gm';
import { PassThrough } from 'stream';
import { IMG_PROC } from '@srvMedia/lib/constants';

const gm = magick.subClass({ imageMagick: true });

const handlerGm = (stream, firstFrame = true) => {
    const through = new PassThrough();

    stream.pipe(through);

    const proc = gm(through)
        .coalesce()
        .autoOrient()
        .limit('memory', '640MB');

    return firstFrame
        ? proc.selectFrame(0)
        : proc;
};

const autoOrientGm = stream => gm(stream)
    .coalesce()
    .autoOrient()
    .limit('memory', '640MB')
    .stream();

const calculateCropDimensions = (width, height, crop) => {
    const scaleFactorCrop = width > height
        ? width / crop.preview_width
        : height / crop.preview_height;

    const canvasWidth = Math.ceil(crop.preview_width * scaleFactorCrop);
    const canvasHeight = Math.ceil(crop.preview_height * scaleFactorCrop);

    const xOffset = Math.abs(Math.ceil((canvasWidth - width) / 2));
    const yOffset = Math.abs(Math.ceil((canvasHeight - height) / 2));

    const cropWidth = Math.ceil(crop.width * scaleFactorCrop);
    const cropHeight = Math.ceil(crop.height * scaleFactorCrop);

    const maxSide = Math.max(cropWidth, cropHeight);

    return {
        x: Math.ceil(crop.x * scaleFactorCrop) - xOffset,
        y: Math.ceil(crop.y * scaleFactorCrop) - yOffset,
        xBorder: Math.abs(Math.ceil((maxSide - cropWidth) / 2)),
        yBorder: Math.abs(Math.ceil((maxSide - cropHeight) / 2)),
        width: cropWidth,
        height: cropHeight,
        maxSide
    };
};

const cropGm = (sourceStream, { width, height }, cropValue) => {
    const crop = calculateCropDimensions(
        width,
        height,
        cropValue
    );

    return handlerGm(sourceStream)
        .background('white')
        .repage(crop.width, crop.height, -crop.x, -crop.y)
        .flatten()
        .extent(crop.maxSide, crop.maxSide, `-${crop.xBorder}-${crop.yBorder}`)
        .quality(80)
        .interlace('Plane')
        .stream('jpeg');
};

const resizeGm = (sourceStream, { width, height }, action) => {
    const img = handlerGm(sourceStream);

    return (action === IMG_PROC.AVATAR
        ? img
            .gravity('Center')
            .resize(width, height, '^')
            .extent(width, height)
        : img.resize(width, height, '>')) // action === IMG_PROC.PREVIEW
        .quality(80)
        .interlace('Plane')
        .stream();
};

const infoGm = sourceStream => new Promise(
    (resolve, reject) => {
        handlerGm(sourceStream, false)
            .identify((error, metadata) => {
                if (error) {
                    return reject(error);
                }

                return resolve({
                    orientation: metadata.Orientation,
                    dimensions: { raw: metadata.size },
                    metadata: JSON.stringify(metadata)
                });
            });
    }
);

export default {
    resize: resizeGm,
    crop: cropGm,
    info: infoGm,
    autoOrient: autoOrientGm
};
