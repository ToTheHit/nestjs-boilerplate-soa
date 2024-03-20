module.exports = {
    rest: {
        api: 'api/v1',
        protocol: 'http://',
        host: 'localhost'
    },
    port: {
        auth: 3038,
        doc: 3039,
        media: 3040
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
    },
    filestore: {
        storage: 'local',
        linkExpire: 2 * 60 * 60 * 1000, // 2 hours
        allowedExceptionMimes: [
            'audio/x-flac',
            'image/x-icon',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/x-cfb'
        ],
        allowedImgMimes: [ // Допустимые mime типы изображений
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/bmp',
            'image/webp'
        ],
        allowedMimes: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
            'application/pdf',
            'application/x-pdf',
            'application/acrobat',
            'applications/vnd.pdf',
            'text/pdf',
            'text/x-pdf',
            'application/zip',
            'image/gif',
            'image/jpeg',
            'image/png',
            'image/webp',
            'text/plain',
            'application/vnd.oasis.opendocument.text',
            'application/x-rar-compressed',
            'application/eps',
            'image/eps',
            'application/cdr',
            'application/coreldraw',
            'image/cdr',
            'application/acad',
            'text/xml',
            'video/mp4',
            'video/webm',
            'audio/mpeg',
            'audio/mp4',
            'audio/wav'
        ],
        providers: {
            mts: {
                id: '',
                secret: '',
                logging: false // not supported
            }
        },
        containers: {
            avatar: 'avatars',
            file: 'files'
        }
    }
};
