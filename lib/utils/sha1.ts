import * as crypto from 'crypto';

export default (string: string, salt?: string) => (salt ? crypto.createHmac('sha1', salt) : crypto.createHash('sha1'))
    .update(string)
    .digest('hex');
