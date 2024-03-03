import validator from 'validator';
import { PassThrough } from 'stream';
import path from 'path';
import { URL } from 'url';
import { parse as contentDispositionParser } from 'content-disposition';

import { ForbiddenError, ValidationError } from '@lib/errors';
import request from '@lib/utils/request';

const getFileByLink = async (url: string, defaultName: string, options = {}) => {
    const isValidUrl = validator.isURL(url, {
        protocols: ['http', 'https'],
        require_protocol: true,
        allow_underscores: true,
        disallow_auth: true
    });

    if (!isValidUrl) {
        throw new ValidationError('incorrect url');
    }

    return request({
        url,
        ...options,
        maxRedirects: 5,
        timeout: 60000,
        responseType: 'stream'
    }, true)
        .then(response => {
            if (response.status < 200 || response.status >= 300) {
                throw new ForbiddenError('external server error', { url, status: response.status });
            }

            const {
                'content-type': mimeType,
                'content-disposition': disposition
            } = <Record<string, string>>(response.headers);

            return {
                stream: response.data.complete
                    ? response.data.pipe(new PassThrough())
                    : response.data,
                mimeType,
                filename: (disposition
                    ? contentDispositionParser(disposition).parameters.filename
                    : defaultName || path.basename((new URL(url)).pathname)) || defaultName || 'image'
            };
        })
        .catch(error => {
            throw new ForbiddenError('external server error', {
                url,
                status: error.status,
                data: error.options?.data || null
            });
        });
};

export default getFileByLink;
