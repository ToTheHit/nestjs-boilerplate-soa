import * as crypto from 'crypto';
import pipe from '@srvMedia/lib/utils/streamPipe';

const hashAndSize = fileStream => {
    let size = 0;

    const calc = crypto.createHash('md5').setEncoding('hex');

    fileStream.on('data', chunk => {
        size += chunk.length;
    });

    return pipe(fileStream, calc)
        .then(() => ({ size, hash: calc.read() }));
};

export default hashAndSize;
