import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';

import loggerRaw from '../../lib/logger';

const logger = loggerRaw('MongooseModule');

export default (uri: string, models: any) => {
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

                    mongoose.connect(uri);

                    return connection;
                },
                uri
            };
        }
    })];

    if (models.length) {
        data.push(MongooseModule.forFeature(models));
    }

    return data;
};
