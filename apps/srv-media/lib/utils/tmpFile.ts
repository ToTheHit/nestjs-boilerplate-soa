import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PassThrough } from 'stream';

const tmpName = name => `tmp~${name}`;
const tmp = name => path.join(os.tmpdir(), tmpName(name));

const check = (blobName: string) => new Promise(res => {
    fs.access(tmp(blobName), fs.constants.R_OK, err => res(err === null));
});

const open = (blobName: string) => fs.createReadStream(tmp(blobName), {
    autoClose: true,
    emitClose: true
});

const write = (blobName: string) => {
    if (process.env.NODE_ENV === 'test') {
        const mockedStream = new PassThrough();

        mockedStream.on('finish', () => mockedStream.destroy());

        return mockedStream;
    }

    const stream = fs.createWriteStream(tmp(blobName), {
        autoClose: true,
        emitClose: true
    });

    stream.on('finish', () => stream.destroy());

    return stream;
};

const clear = (blobName: string) => new Promise(res => {
    fs.unlink(
        tmp(blobName),
        () => res(null)
    );
});

export {
    open,
    write,
    check,
    clear
};
