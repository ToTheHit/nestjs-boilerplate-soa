import {
    pick,
    omit,
    sortBy,
    fromPairs,
    map,
    chunk as chunkify,
    cloneDeep,
    mapValues,
    groupBy,
    uniqBy,
    difference,
    union,
    intersection,
    intersectionWith,
    get,
    transform,
    sample,
    random,
    isEqual,
    intersectionBy,
    invert,
    flattenDeep,
    differenceWith,
    without,
    isFunction,
    merge,
    filter,
    keyBy
} from 'lodash';
import MagicSchema from '@models/MagicSchema';

export const reduceToObject = (list, fn, init = {}) => {
    let result = init;

    for (let index = 0; index < list.length; index += 1) {
        result = fn(result, list[index], index);
    }

    return result;
};

const numberOperators = ['$lt', '$gt', '$gte', '$lte', '$eq', '$ne', '$size'];
const otherOperators = ['$in', '$all'];

function getObjectKeysWithValuesByObject(o, prefix = '', join = false) {
    return Object.keys(o).reduce((acc, key) => {
        const defaultValue =
      typeof o[key] === 'string' && MagicSchema.ObjectId.isValidStrict(o[key])
          ? new MagicSchema.ObjectId(o[key])
          : o[key];

        if (Object(o[key]) === o[key] && !Array.isArray(o[key]) && !MagicSchema.ObjectId.isValidStrict(o[key])) {
            Object.assign(acc, {
                ...getObjectKeysWithValuesByObject(o[key], `${prefix}${prefix.length > 0 ? '.' : ''}${key}`, join)
            });
        } else if (numberOperators.includes(key) || otherOperators.includes(key)) {
            if (join) {
                if (acc[prefix]) {
                    acc[prefix][key] = o[key];
                } else {
                    Object.assign(acc, {
                        [prefix]: {
                            [key]: o[key]
                        }
                    });
                }
            } else {
                Object.assign(acc, {
                    [`${prefix}.${key}`]: o[key]
                });
            }
        } else {
            const updatedKey = `${prefix}${prefix.length > 0 ? '.' : ''}${key}`;

            Object.assign(acc, {
                [updatedKey]: defaultValue
            });
        }

        return acc;
    }, {});
}

const compareValues = (firstValue, secondValue) => {
    // eslint-disable-next-line guard-for-in
    for (const value in firstValue) {
        const isFirstValueExists = Object.prototype.hasOwnProperty.call(firstValue, value);
        const isSecondValueExists = Object.prototype.hasOwnProperty.call(secondValue, value);

        if (isFirstValueExists !== isSecondValueExists) {
            return false;
        }

        switch (typeof firstValue[value]) {
            case 'object':
                if (firstValue[value] === null && firstValue[value] !== secondValue[value]) {
                    return false;
                }
                if (!compareValues(firstValue[value], secondValue[value])) {
                    return false;
                }
                break;
            case 'function':
                if (
                    typeof secondValue[value] === 'undefined' ||
          firstValue[value].toString() !== secondValue[value].toString()
                ) {
                    return false;
                }
                break;
            default:
                if (firstValue[value] !== secondValue[value]) {
                    return false;
                }
        }
    }
    for (const value in secondValue) {
        if (Object.prototype.hasOwnProperty.call(secondValue, value) && typeof firstValue[value] === 'undefined') {
            return false;
        }
    }

    return true;
};

function getObjectsDiff(original = {}, target = {}) {
    const result = {};

    Object.keys(target).forEach(key => {
        if (typeof target[key] !== 'object' || target[key] === null) {
            if (target[key] !== original[key]) {
                result[key] = target[key];
            }
        } else if (
            MagicSchema.ObjectId.isValidStrict(target[key]) ||
            MagicSchema.ObjectId.isValidStrict(original[key])
        ) {
            if (`${target[key]}` !== `${original[key]}`) {
                result[key] = target[key];
            }
        } else if (!compareValues(original[key] || {}, target[key])) {
            result[key] = target[key];
        }
    });

    return result;
}

export {
    pick,
    omit,
    sortBy,
    fromPairs,
    map,
    cloneDeep,
    mapValues,
    groupBy,
    uniqBy,
    difference,
    union,
    intersection,
    intersectionWith,
    get,
    transform,
    sample,
    random,
    isEqual,
    intersectionBy,
    invert,
    flattenDeep,
    differenceWith,
    without,
    isFunction,
    merge,
    chunkify,
    filter,
    keyBy,
    getObjectKeysWithValuesByObject,
    getObjectsDiff,
    compareValues
};
