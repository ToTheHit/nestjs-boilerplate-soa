module.exports = {
    rest: {
        api: '', // api/v1
        protocol: 'http://',
        host: 'localhost:3000'
    },
    muteUnknownFieldsError: true,
    session: {
        cookieKey: 'sid',
        secret: '11111111c1',
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
    }
};
