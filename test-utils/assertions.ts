import * as should from 'should';
import * as sinon from 'sinon';
import Redis from 'ioredis-mock';
import { MongoMemoryServer } from 'mongodb-memory-server';

import RedisConnector from '@db/Redis/RedisConnector';
import { isEqual } from '../lib/utils/fn';
import loggerRaw from '../lib/logger';
import { rabbitMQHandler } from '../srv-db/index';

import('should-sinon');

const logger = loggerRaw('STUB');

sinon.stub({ connector: RedisConnector }, 'connector')
    .returns(Redis);
sinon.stub(rabbitMQHandler, 'connect')
    .callsFake(() => {
        logger.info('RabbitMQ connected');

        return Promise.resolve(null);
    });
// sinon.stub(MQListener, 'run')
//     .returns(Promise.resolve(null));

const fakeQueue = new Map();

sinon.stub(rabbitMQHandler, 'subscribe').callsFake(async (key, handler) => {
    fakeQueue[key] = msg => {
        logger.info('got message %j', { event: key, data: msg });

        return Promise.resolve(handler(msg, {
            ack: () => {},
            nack: () => {}
        }));
    };
});
sinon.stub(rabbitMQHandler, 'publish').callsFake(async (key, type, data, additionalFields = {}) => {
    const msg = { ...additionalFields, data, type };

    logger.info('send message %j', { event: key, data: msg });

    if (fakeQueue[key]) {
        await fakeQueue[key](msg);
    }
});

function softCompareObjects(firstObject, secondObject) {
    let isSoftEqual = true;

    for (const key of Object.keys(firstObject)) {
        if (!isEqual(firstObject[key], secondObject[key])) {
            isSoftEqual = false;
        }
    }

    return isSoftEqual;
}

// @ts-ignore
should.Assertion.add(
    'baseResponse',
    function () {
        this.params = { operator: 'to be a valid base response' };
        const httpBody = this.obj;

        should.exists(httpBody);

        httpBody.should.be.an.Object();
        httpBody.should.have.properties(['error', 'handle_status', 'requestId', 'result', 'status']);
    },
    true
);

// @ts-ignore
should.Assertion.add(
    'successResponse',
    function () {
        this.params = { operator: 'to be a success response' };

        const httpBody = this.obj;

        httpBody.should.be.a.baseResponse();

        should.not.exists(httpBody.error);
        httpBody.handle_status.should.be.equal('success');
        httpBody.status.should.be.greaterThanOrEqual(200);
        httpBody.status.should.be.lessThan(300);
        (typeof httpBody.result).should.not.be.equal('undefined');
    },
    true
);

// @ts-ignore
should.Assertion.add(
    'errorResponse',
    function (statusCode, errorObject) {
        this.params = { operator: 'to be a error response' };

        const httpBody = this.obj;

        httpBody.should.be.a.baseResponse();

        should.exists(httpBody.error);

        httpBody.handle_status.should.be.equal('failure');
        httpBody.status.should.not.be.equal(200);

        if (statusCode) {
            httpBody.status.should.be.equal(statusCode);
        }

        if (errorObject) {
            httpBody.error.should.containEql(errorObject);
        }
    },

    true
);

// @ts-ignore
should.Assertion.add(
    'oneFrom',
    function (array) {
        this.params = { operator: 'to be one from array' };

        const object = this.obj;

        should.exists(object);

        const index = array.findIndex(elem => isEqual(object, elem));

        index.should.be.not.equal(-1, `${JSON.stringify(object)} wasnt in array ${array}`);
        // array[index] = null;
    },

    true
);

// @ts-ignore
should.Assertion.add(
    'softOneFrom',
    function (array) {
        this.params = { operator: 'to be one from array' };

        const object = this.obj;

        should.exists(object);

        const index = array.findIndex(elem => softCompareObjects(object, elem));

        index.should.be.not.equal(-1, `${JSON.stringify(object)} wasnt in array ${JSON.stringify(array)}`);
        // array[index] = null;
    },
    true
);

// @ts-ignore
should.Assertion.addChain(
    'Errors',
    function () {
        this.params = { operator: 'to be a valid error' };

        const error = this.obj;

        should.exists(error);
        error.should.be.an.Object();
        error.should.have.properties(['errors', 'handle_status', 'requestId', 'result', 'status']);
        error.errors.forEach(item => {
            item.should.have.properties(['message', 'name', 'stack']);
            item.stack.forEach(item => (
                item.should.have.properties(['columnNumber', 'fileName', 'lineNumber', 'source'])
            ));
        });
    },
    true
);

// @ts-ignore
should.Assertion.add(
    'valuesErr',
    function (arrOfErr, handle_status, status) {
        const error = this.obj;

        error.should.have.properties({
            handle_status,
            status
        });

        error.errors.forEach(function (item, i, arr) {
            const errValue = arrOfErr[i];

            item.should.have.properties({
                // message: errValue.message,
                name: errValue.name
            });
        });
    }
);

let isAsserted = false;

const assert = async () => {
    if (!isAsserted) {
        isAsserted = true;
        // 6.0.9
        const mongoServer = await MongoMemoryServer.create({
            binary: { version: '7.0.2' },
            instance: { port: 27018 }
        });
    }

    return should;
};

export default assert;
