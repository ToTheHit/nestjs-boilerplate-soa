import * as crypto from 'crypto';

export default (string, salt) => (salt ? crypto.createHmac('sha1', salt) : crypto.createHash('sha1'))
    .update(string)
    .digest('hex');
