import { MongoMemoryServer } from 'mongodb-memory-server';

require('ts-node/register');

let mongoServer: MongoMemoryServer;

const setup = async () => {
    mongoServer = await MongoMemoryServer.create({
        binary: { version: '7.0.2' },
        instance: { port: 27018 }
    });
    global.mongoServer = mongoServer;
};

export default setup;
