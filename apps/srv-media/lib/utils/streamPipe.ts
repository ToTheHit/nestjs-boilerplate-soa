import * as util from 'util';
import { pipeline } from 'stream';

const pipe = util.promisify(pipeline);

export default pipe;
