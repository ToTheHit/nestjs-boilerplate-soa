import { MongoMemoryServer } from 'mongodb-memory-server';

const globalTeardown = async () => {
    await (<MongoMemoryServer>global.mongoServer).stop();
};

export default globalTeardown;
