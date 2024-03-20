import { MongoMemoryServer } from 'mongodb-memory-server';

afterAll(async () => {
    await (<MongoMemoryServer>global.mongoServer).stop();
});
