import sha1 from '@lib/utils/sha1';

const getFileId = (prefix, userId, filename) => (
    `${prefix}_v3_${sha1(`${process.pid}*${Math.random() + Date.now()}*${filename}*${userId}`)}`
);

export default getFileId;
