import { Stream } from 'stream';

const MAX_DIMENSIONS = { width: 1920, height: 1080 };

const IMG_PROC = {
    AVATAR: 'thumb',
    PREVIEW: 'resize'
} as const;

type ImgProc = typeof IMG_PROC[keyof typeof IMG_PROC];

export {
    MAX_DIMENSIONS,
    IMG_PROC,
    ImgProc
};

export type TFileSaver = (systemName: string, stream: Stream) => Promise<unknown>;
export type TUploadResult = {
    files: Array<{
        systemName: string;
        meta: any;
    }>,
    fields: Record<string, any[]>
}
