import axios, { AxiosRequestConfig, ResponseType } from 'axios';
import { Stream } from 'stream';
import loggerRaw from '@lib/logger';
import { errorParse, ExternalRequestError } from '@lib/errors';

const logger = loggerRaw('AXIOS');

const dataForLog = data => {
    if (data) {
        if (data instanceof FormData) {
            return 'form-data';
        }

        if (data instanceof Stream) {
            return 'stream';
        }

        return data;
    }

    return null;
};

const request = (optionsRaw: AxiosRequestConfig, rawResponse = false, requestId = null) => {
    const instance = axios.create();

    const {
        data,
        timeout = 60000,
        ...opts
    } = optionsRaw;

    const { CancelToken } = axios;
    const source = CancelToken.source();
    const timeoutId = setTimeout(
        () => source.cancel(`Timeout of ${timeout}ms.`),
        timeout
    );

    const options = {
        ...optionsRaw,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        cancelToken: source.token
    };

    if (options.data instanceof FormData) {
        Object.assign(options, {
            headers: {
                ...(options.headers || {})
                // ...options.data.getHeaders()
            }
        });
    }

    const logOpts = {
        ...opts,
        data: dataForLog(data)
    };

    logger.debug(logOpts);

    return instance(options)
        .then(response => {
            clearTimeout(timeoutId);

            return rawResponse ? response : response.data;
        })
        .catch(error => {
            if (error.response) {
                /*
                 * The request was made and the server responded with a
                 * status code that falls out of the range of 2xx
                 */

                let responseData = options.responseType === 'stream'
                    ? error.response.data._readableState.buffer.head.data.toString()
                    : error.response.data;

                try {
                    responseData = JSON.parse(responseData);
                } catch (e) {}

                throw new ExternalRequestError(`[RESPONSE] ${error.message}`, error.response.status, {
                    data: responseData,
                    headers: error.response.headers,
                    options: logOpts,
                    requestId
                });
            } else if (error.request) {
                /*
                 * The request was made but no response was received, `error.request`
                 * is an instance of XMLHttpRequest in the browser and an instance
                 * of http.ClientRequest in Node.js
                 */
                throw new ExternalRequestError(`[REQUEST] ${error.message}`, 0, {
                    data: null,
                    headers: error.request.headers,
                    options: logOpts,
                    requestId
                });
            }
            const { stack } = new Error();

            error.stack = stack;
            throw errorParse(error);
        })
        .catch(error => {
            logger.error(error, requestId);

            throw error;
        });
};

export default request;
