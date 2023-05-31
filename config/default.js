module.exports = {
    rest: {
        api: '', // api/v1
        protocol: 'http://',
        host: 'localhost:3000'
    },
    muteUnknownFieldsError: true,
    session: {
        cookieKey: 'sid',
        secret: 'abcd',
        headerKey: 'Bearer',
        ttl: 1000 * 60 * 60 * 24 * 7
    },
    logger: {
        level: 'debug',
        // path: '/../../logs',
        // filename: 'app.log',
        timeZoneOffset: 3,
        service: {
            queue: {
                durable: true,
                autoDelete: false
            },
            level: 'info',
            location: './logs',
            logFileName: 'app.log',
            bufferSize: 1000,
            bufferTimeout: 10000
        }
    },

    amqpURL: 'amqp://127.0.0.1?heartbeat=60000',
    amqpOptions: {},
    queuePrefix: '',
    prefetchCount: 10,

    redis: {
        host: '127.0.0.1',
        port: 6379,
        retryStrategy: () => 5000,
        connectTimeout: 10000,
        enableReadyCheck: true,
        enableOfflineQueue: true
    }
};
