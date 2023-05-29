// https://github.com/joyent/node-verror

import axios from 'axios';
import { MongoError } from 'mongodb';
import mongoose from 'mongoose';
import FormData from 'form-data';

import { BadRequestException } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import errorParseStacktrace from './Restify/utils/errorParseStacktrace';

const { Cancel: AxiosCancel } = axios;
const { Error: MongooseError } = mongoose;

interface IOptions {
  [key: string]: NonNullable<unknown>;
}
interface IMisc extends IOptions {
  blockTime?: number | null;
  message?: string | null;
}

class GenericError extends Error {
    private status: number;

    private timestamp: number;

    protected misc: IMisc;

    protected result: NonNullable<unknown>;

    protected code: NonNullable<unknown>;

    protected options: any;

    /**
   * Базовый класс для всех ошибок
   * @param {string} message
   * @param {number} status
   */
    constructor(message, status = 500) {
        super(message);

        this.name = this.constructor.name;
        this.status = status;
        this.timestamp = Date.now();

        Error.captureStackTrace(this, this.constructor);
    }

    toJSON(addStack) {
        return {
            name: this.name,
            status: this.status,
            timestamp: this.timestamp,
            message: this.message
        };
    }

    async getStack() {
        return errorParseStacktrace(this);
    }
}

class AccessDenied extends GenericError {
    constructor(message, misc, result = null) {
        super(message || 'access denied', 403);
        this.misc = misc;
        this.result = result;
    }

    toJSON(addStack) {
        return { ...super.toJSON(addStack), misc: this.misc };
    }
}

class ServerError extends GenericError {
    constructor(message, misc = {}) {
        super(message, 502);
        this.misc = misc;
    }

    toJSON(addStack) {
        return { ...super.toJSON(addStack), misc: this.misc };
    }
}

class DatabaseError extends GenericError {
    constructor(message, misc = {}) {
        super(message, 502);
        this.misc = misc;
    }

    toJSON(addStack) {
        return { ...super.toJSON(addStack), code: this.code };
    }
}

class NoAuthError extends GenericError {
    constructor(message) {
        super(message, 401);
    }
}

class ForbiddenError extends GenericError {
    constructor(message, misc: IMisc = {}) {
        super(message, 403);

        this.misc = misc;
    }

    toJSON(addStack) {
        const { blockTime = null, ...misc } = this.misc || {};

        return Object.assign(super.toJSON(addStack), {
            blockTime,
            misc
        });
    }
}

class QuotasError extends GenericError {
    constructor(message, misc) {
        super(message, 403);
        this.misc = misc;
    }

    toJSON(addStack) {
        return { ...super.toJSON(addStack), misc: this.misc };
    }
}

class UnsupportedContent extends GenericError {
    private accept: NonNullable<unknown>;

    private provided: NonNullable<unknown>;

    constructor(accept, provided) {
        super(undefined, 415);

        this.accept = accept;
        this.provided = provided;
    }

    toJSON(addStack) {
        return {
            ...super.toJSON(addStack),
            accept: this.accept,
            provided: this.provided
        };
    }
}

class UnrecoverableError extends GenericError {
    constructor(message) {
        super(message, 456);
    }
}

class NotAcceptable extends GenericError {
    constructor(message) {
        super(message, 406);
    }
}

class NotFoundError extends GenericError {
    constructor(message, misc = {}) {
        super(message, 404);
        this.misc = misc;
    }

    toJSON(addStack) {
        return { ...super.toJSON(addStack), misc: this.misc };
    }
}

class ValidationError extends GenericError {
    constructor(message, misc: IMisc = {}) {
        super(message, 422);
        this.misc = misc;

        if (misc.message) {
            this.message = misc.message;
        }
    }

    toJSON(addStack) {
        return { ...super.toJSON(addStack), misc: this.misc };
    }
}

class BadRequest extends GenericError {
    constructor(message) {
        super(message, 400);
    }
}

class TimeoutError extends GenericError {
    constructor(message) {
        super(message, 408);
    }
}

class TooManyRequests extends GenericError {
    constructor(message) {
        super(message, 429);
    }
}

class ExternalRequestError extends GenericError {
    constructor(message, status, options: IOptions = {}) {
        super(message, status);

        this.options = options;
    }

    toJSON(addStack) {
        const { data, ...options } = this.options;

        return {
            ...super.toJSON(addStack),
            options: {
                ...options,
                data: data instanceof FormData ? 'form-data' : data
            }
        };
    }
}

class ExternalRequestTimeoutError extends GenericError {
    constructor(message, status, options: IOptions = {}) {
        super(message, status);

        this.options = options;
    }

    toJSON(addStack) {
        return {
            ...super.toJSON(addStack),
            options: this.options
        };
    }
}

export function errorParse(error) {
    let err = typeof error === 'string' ? new UnrecoverableError(error) : error;

    if (err instanceof AxiosCancel) {
        err = new ExternalRequestTimeoutError(err, 408);
    }

    if (error instanceof HttpException) {
        // TODO: реализовать проверку на прочие типы ошибок от NestJS
        if (error instanceof BadRequestException) {
            // @ts-ignore
            err = new ValidationError('can not validate fields', { reason: error.getResponse().message });
        } else {
            err = error;
        }
        err.stack = error.stack;

        return err;
    }
    if (!(error instanceof GenericError)) {
        if (error instanceof MongoError || error instanceof MongooseError) {
            if (error instanceof MongooseError.ValidationError || error instanceof MongooseError.CastError) {
                err = new ValidationError(error.message, (<mongoose.Error.ValidationError>error).errors);
            } else if (error instanceof MongooseError.DocumentNotFoundError) {
                err = new NotFoundError(error.message, { type: error.name });
            } else {
                err = new DatabaseError(error.message, { type: error.name });
            }

            // TODO: реализовать проверку на прочие типы ошибок для mongoose
        } else if (
            error instanceof EvalError ||
            error instanceof RangeError ||
            error instanceof ReferenceError ||
            error instanceof SyntaxError ||
            error instanceof TypeError ||
            error instanceof URIError ||
            error instanceof Error
        ) {
            err = new ServerError(error.message, { type: error.name });
        }

        err.stack = error.stack;
    }

    return err;
}

export {
    GenericError,
    AccessDenied,
    ServerError,
    ForbiddenError,
    UnrecoverableError,
    NotAcceptable,
    NotFoundError,
    QuotasError,
    ValidationError,
    DatabaseError,
    BadRequest,
    NoAuthError,
    UnsupportedContent,
    TooManyRequests,
    TimeoutError,
    ExternalRequestError,
    ExternalRequestTimeoutError
};

export const errorUnserialize = () => new Error();
