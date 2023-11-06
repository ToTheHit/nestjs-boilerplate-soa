import { MongoMemoryServer } from 'mongodb-memory-server';

require('ts-node/register');

const setup = async () => {
    const mongoServer = await MongoMemoryServer.create({
        binary: { version: '7.0.2' },
        instance: { port: 27018 }
    });
};

export default setup;
