export default req => {
    if (typeof req.requestParams !== 'object') {
        req.requestParams = {};
    }

    if (req.params) {
        for (const param of Object.keys(req.params)) {
            if (typeof req.requestParams[param] !== 'undefined') {
                if (!Array.isArray(req.requestParams[param])) {
                    req.requestParams[param] = [req.requestParams[param]];
                }
                req.requestParams[param].push(req.params[param]);
            } else {
                req.requestParams[param] = req.params[param];
            }
        }
    }

    req.requestParam = (paramName, posFromEnd = 0) => (
        Array.isArray(req.requestParams[paramName])
            ? req.requestParams[paramName][req.requestParams[paramName].length - posFromEnd - 1]
            : req.requestParams[paramName]
    );
};
