import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { session as options } from 'config';

import MagicSchema from '@models/MagicSchema';
import loggerRaw from '../../logger';
import { getRawDataFromRequest } from '../getAccountFromRequest';

const logger = loggerRaw('RequestInfoInterceptor');

const getIp = req => {
    if (req.headers['x-forwarded-for']) {
        return req.headers['x-forwarded-for'].split(',')[0];
    }
    if (req.connection && req.connection.remoteAddress) {
        return req.connection.remoteAddress;
    }

    return req.ip;
};

const buildPlatformName = deviceName => {
    if (deviceName) {
        const name = deviceName.toLowerCase();

        if (name.indexOf('android') >= 0) {
            return 'android';
        }

        if (name.indexOf('ios') >= 0) {
            return 'ios';
        }

        if (name.indexOf('windows') >= 0) {
            return 'windows';
        }

        if (name.indexOf('test') >= 0) {
            return 'test';
        }
    }

    return 'web';
};

@Injectable()
export default class RequestInfoInterceptor implements NestInterceptor {
    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ) {
        logger.debug('>>> BEFORE GLOBAL RequestInfoInterceptor');
        const req = context.switchToHttp().getRequest();

        const {
            geoip_city: city = 'Не определен',
            geoip_country_code: requestCountry,
            'x-client-version': clientVersion,
            'x-user-device': deviceHeader,
            'user-agent': uaHeader
        } = req.headers;

        let platform;
        let deviceName;

        const data = getRawDataFromRequest(req.headers, options);

        if (data && data.sid) {
            const Device = MagicSchema.model('device');
            const deviceInfo = await Device.findOne({ sessionId: data.sid }).select('platform deviceName');

            if (deviceInfo) {
                deviceName = deviceInfo.deviceName;
                platform = deviceInfo.platform;
            }
        }

        if (!deviceName || !platform) {
            deviceName = deviceHeader || (uaHeader ? 'web' : null);
            platform = buildPlatformName(deviceName);
        }
        req.requestInfo = {
            requestCountry,
            city,
            clientVersion,
            deviceName,
            platform,
            agent: platform === 'web'
                ? uaHeader
                : deviceHeader
        };

        return next.handle().pipe(data => {
            return data;
        });
    }
}
