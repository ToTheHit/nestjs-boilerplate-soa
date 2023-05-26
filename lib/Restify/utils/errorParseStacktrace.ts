export function get(belowFn) {
    const oldLimit = Error.stackTraceLimit;

    Error.stackTraceLimit = Infinity;

    const dummyObject = {
        stack: undefined
    };

    const v8Handler = Error.prepareStackTrace;

    // eslint-disable-next-line no-shadow
    Error.prepareStackTrace = function (dummyObject, v8StackTrace) {
        return v8StackTrace;
    };
    Error.captureStackTrace(dummyObject, belowFn || get);

    const v8StackTrace = dummyObject.stack;

    Error.prepareStackTrace = v8Handler;
    Error.stackTraceLimit = oldLimit;

    return v8StackTrace;
}

function CallSite(properties) {
    // eslint-disable-next-line guard-for-in
    for (const property in properties) {
        this[property] = properties[property];
    }
}

const strProperties = [
    'this',
    'typeName',
    'functionName',
    'methodName',
    'fileName',
    'lineNumber',
    'columnNumber',
    'function',
    'evalOrigin'
];

const boolProperties = [
    'topLevel',
    'eval',
    'native',
    'constructor'
];

strProperties.forEach(function (property) {
    CallSite.prototype[property] = null;
    CallSite.prototype[`get${property[0].toUpperCase()}${property.substr(1)}`] = function () {
        return this[property];
    };
});

boolProperties.forEach(function (property) {
    CallSite.prototype[property] = false;
    CallSite.prototype[`is${property[0].toUpperCase()}${property.substr(1)}`] = function () {
        return this[property];
    };
});

function createParsedCallSite(properties) {
    return new CallSite(properties);
}

export default err => {
    if (!err.stack) {
        return [];
    }

    const lines = err.stack.split('\n').slice(1);

    return lines
        .map(function (line) {
            if (line.match(/^\s*[-]{4,}$/)) {
                return createParsedCallSite({
                    fileName: line,
                    lineNumber: null,
                    functionName: null,
                    typeName: null,
                    methodName: null,
                    columnNumber: null,
                    native: null
                });
            }

            const lineMatch = line.match(/at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/);

            if (!lineMatch) {
                // eslint-disable-next-line consistent-return
                return;
            }

            let object = null;
            let method = null;
            let functionName = null;
            let typeName = null;
            let methodName = null;
            const isNative = (lineMatch[5] === 'native');

            if (lineMatch[1]) {
                functionName = lineMatch[1];
                let methodStart = functionName.lastIndexOf('.');

                if (functionName[methodStart - 1] == '.') {
                    methodStart--;
                }
                if (methodStart > 0) {
                    object = functionName.substr(0, methodStart);
                    method = functionName.substr(methodStart + 1);
                    const objectEnd = object.indexOf('.Module');

                    if (objectEnd > 0) {
                        functionName = functionName.substr(objectEnd + 1);
                        object = object.substr(0, objectEnd);
                    }
                }
            }

            if (method) {
                typeName = object;
                methodName = method;
            }

            if (method === '<anonymous>') {
                methodName = null;
                functionName = null;
            }

            const properties = {
                fileName: lineMatch[2] || null,
                lineNumber: parseInt(lineMatch[3], 10) || null,
                functionName,
                typeName,
                methodName,
                columnNumber: parseInt(lineMatch[4], 10) || null,
                native: isNative
            };

            return createParsedCallSite(properties);
        })
        .filter(function (callSite) {
            return !!callSite;
        });
};
