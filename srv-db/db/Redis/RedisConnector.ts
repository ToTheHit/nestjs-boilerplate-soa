import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

const RedisConnector = () => (process.env.NODE_ENV !== 'test' ? Redis : RedisMock);

export default RedisConnector;
