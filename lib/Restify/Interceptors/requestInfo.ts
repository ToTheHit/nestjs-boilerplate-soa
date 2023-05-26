import { Reflector } from '@nestjs/core';
import {
    CallHandler, ExecutionContext, Injectable, NestInterceptor
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import prepareRequestParams from '../utils/prepareRequestParams';

const getIp = req => {
    if (req.headers['x-forwarded-for']) {
        return req.headers['x-forwarded-for'].split(',')[0];
    }
    if (req.connection && req.connection.remoteAddress) {
        return req.connection.remoteAddress;
    }

    return req.ip;
};

@Injectable()
export default class RequestInfoInterceptor implements NestInterceptor {
    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<any> {
        console.log('>>> BEFORE GLOBAL RequestInfoInterceptor');
        const req = context.switchToHttp().getRequest();

        const {
            geoip_city: city = 'Не определен',
            geoip_country_code: requestCountry,
            'x-client-version': clientVersion,
            'x-user-device': deviceHeader,
            'user-agent': uaHeader
        } = req.headers;

        const platform = 'web';
        const deviceName = 'test';

        // const data = getRawDataFromRequest(req.headers, options, true);
        //
        // if (data && data.sid) {
        //   const Device = SmartySchema.model('device');
        //   const deviceInfo = await Device.findOne({ sessionId: data.sid }).select('platform deviceName');
        //
        //   if (deviceInfo) {
        //     deviceName = deviceInfo.deviceName;
        //     platform = deviceInfo.platform;
        //   }
        // }
        //
        // if (!deviceName || !platform) {
        //   deviceName = deviceHeader || (uaHeader ? 'web' : null);
        //   platform = buildPlatformName(deviceName);
        // }
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

        return next.handle();
    }
}
