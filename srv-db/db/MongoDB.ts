import { MongooseModule } from '@nestjs/mongoose';

import loggerRaw from '../../lib/logger';

const logger = loggerRaw('MongooseModule');

export default (models: any) => {
    const data = [MongooseModule.forRootAsync({
        useFactory: async () => {
            return {
                connectionFactory: connection => {
                    if (connection.readyState === 1) {
                        logger.info('Database Connected successfully');
                    }
                    connection.on('connected', () => {
                        logger.info('is connected');
                    });
                    connection.on('disconnected', () => {
                        logger.warn('Database disconnected');
                    });
                    connection.on('error', error => {
                        logger.error(error);
                    });

                    return connection;
                },
                uri: 'mongodb://127.0.0.1:27017/nestjs'
            };
        }
    })];

    if (models.length) {
        data.push(MongooseModule.forFeature(models));
    }

    return data;
};

// MongooseModule.forRootAsync({
//     useFactory: async () => ({
//         uri: 'mongodb://127.0.0.1:27017/nestjs',
//         autoIndex: false,
//         noDelay: true,
//         connectTimeoutMS: 3000,
//         keepAlive: true,
//         keepAliveInitialDelay: 300000,
//         connectionFactory: connection => {
//             console.log('!!!!!!');
//             connection.on('connected', () => {
//                 console.log('is connected');
//             });
//             connection.on('disconnected', () => {
//                 console.log('DB disconnected');
//             });
//             connection.on('error', error => {
//                 console.log('DB connection failed! for error: ', error);
//             });
//
//             return connection;
//         },
//         connectionErrorFactory: error => {
//             console.log('MONGOOSE ERROR', error);
//
//             return error;
//         }
//     })
// }),

// MongooseModule.forRoot('mongodb://127.0.0.1:27017', {
//     autoIndex: false,
//     noDelay: true,
//     connectTimeoutMS: 3000,
//     keepAlive: true,
//     keepAliveInitialDelay: 300000,
//     connectionFactory: connection => {
//         console.log('!!!!!!');
//         connection.on('connected', () => {
//             console.log('is connected');
//         });
//         connection.on('disconnected', () => {
//             console.log('DB disconnected');
//         });
//         connection.on('error', error => {
//             console.log('DB connection failed! for error: ', error);
//         });
//
//         return connection;
//     },
//     connectionErrorFactory: error => {
//         console.log('MONGOOSE ERROR', error);
//
//         return error;
//     }
// }),
