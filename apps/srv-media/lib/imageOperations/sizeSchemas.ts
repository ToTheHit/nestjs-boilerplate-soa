import { IMG_PROC, ImgProc } from '@srvMedia/lib/constants';
import { NotFoundError } from '@lib/errors';

const imgSizeList = [
    {
        width: 16,
        height: 16,
        action: IMG_PROC.AVATAR
    }, // avatar (web)
    {
        width: 48,
        height: 48,
        action: IMG_PROC.AVATAR
    }, // avatar (web)
    {
        width: 96,
        height: 96,
        action: IMG_PROC.AVATAR
    }, // avatar (web)
    {
        width: 156,
        height: 156,
        action: IMG_PROC.AVATAR
    }, // avatar (ios, android)
    {
        width: 350,
        height: 416,
        action: IMG_PROC.AVATAR
    }, // avatar (android)
    {
        width: 270,
        height: 270,
        action: IMG_PROC.AVATAR
    }, // avatar (web, android)

    {
        width: 48,
        height: 48,
        action: IMG_PROC.PREVIEW
    }, // preview in files table (web)
    {
        width: 360,
        height: 360,
        action: IMG_PROC.PREVIEW
    }, // preview in message attache (web)
    {
        width: 540,
        height: 450,
        action: IMG_PROC.PREVIEW
    }, // preview in message attache, in crop (web)
    {
        width: 966,
        height: 600,
        action: IMG_PROC.PREVIEW
    }, // preview in preview window (web, ios, android)
    {
        width: 1920,
        height: 1080,
        action: IMG_PROC.PREVIEW
    } // "fullsize" preview (web)
];

/**
 * Функция возвращает схему кропа для коллекции и размера (или null, если нет соответствующей коллекции)
 * @param {'resize'|'thumb'} action
 * @param {string} size Размер нужного аватара (Например, "50x50")
 * @return {{width: *, height: *}}
 */
const getResizeSchema = (action: ImgProc, size: string): { width: number, height: number } => {
    const [widthRaw, heightRaw] = size.split('x');
    const width = parseInt(widthRaw, 10);
    const height = parseInt(heightRaw, 10);

    if (!Number.isNaN(width) && !Number.isNaN(height)) {
        for (const schema of imgSizeList) {
            if (schema.width === width && schema.height === height && schema.action === action) {
                return schema;
            }
        }
    }

    throw new NotFoundError('not supported size', { size });
};

/**
 *
 * @param {'resize'|'thumb'} action
 * @param {Object} size
 * @param {number} size.width
 * @param {number} size.height
 * @returns {*[]}
 */
type TSize = { width: number, height: number }
const getSuitableSizes = (action: ImgProc, {
    width,
    height
}: TSize) => {
    return imgSizeList.reduce((list, size) => (
        size.action === action && (size.width < width || size.height < height)
            ? list.concat(size)
            : list
    ), []);
};

export {
    getResizeSchema,
    getSuitableSizes
};
