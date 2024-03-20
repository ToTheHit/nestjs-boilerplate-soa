import { getObjectKeysWithValuesByObject } from '@lib/utils/fn';
import MagicSchema from '../../../../srv-db/models/MagicSchema';

const defaultDescription = 'Список фильтров объектов, над которыми происходит операция';

const checkValue = (field, valueRaw) => !(field.options.type === String && field.options.enum && !field.options.enum.includes(valueRaw));

const buildFilterField = field => ({
    [field.path]: {
        validate: {
            validator(valueRaw) {
                const operators = field.options.type === Number
                    ? ['$lt', '$gt', '$gte', '$lte', '$eq', '$ne']
                    : ['$eq', '$ne'];

                if (typeof valueRaw === 'object') {
                    for (const op of Object.keys(valueRaw)) {
                        if (!operators.includes(op) || !checkValue(field, valueRaw[op])) {
                            // return false;
                        }
                    }

                    return true;
                }

                return checkValue(field, valueRaw);
            }
        },
        default: undefined,
        type: MagicSchema.Types.Mixed
    }
});

const castType = (field, valueRaw) => {
    if (valueRaw === 'null') {
        return null;
    }
    if (field.options.type === Number) {
        return parseInt(valueRaw, 10);
    }

    return field.cast(valueRaw);
};

const equationOperators = {
    $or: true,
    $in: true,
    $all: true,
    $size: true
};

class FilterHandler {
    private filter: any;

    buildFilterQuery(Model) {
        const raw = (this.filter || this).toJSON();
        const result = {};

        Model.schema.eachPath((fieldName, field) => {
            const { [fieldName]: valueRaw } = raw;

            if (field.options.in_filter && typeof valueRaw !== 'undefined') {
                if (Array.isArray(valueRaw)) {
                    const tempObj = {};

                    if (equationOperators[valueRaw[0]]) {
                        tempObj[valueRaw[0]] = [];

                        for (let i = 1; i < valueRaw.length; i += 1) {
                            tempObj[valueRaw[0]].push(castType(field, valueRaw[i]));
                        }

                        Object.assign(result, { [fieldName]: tempObj });
                    } else {
                        valueRaw.forEach(value => {
                            Object.assign(result, { [fieldName]: field, value });
                        });
                    }
                } else if (typeof valueRaw === 'object' && !Array.isArray(valueRaw)) {
                    const keys = getObjectKeysWithValuesByObject(valueRaw, '', true);

                    for (const key of Object.keys(keys)) {
                        Object.assign(result, { [key ? `${fieldName}.${key}` : `${fieldName}${key}`]: keys[key] });
                    }
                } else {
                    Object.assign(result, {
                        [fieldName]: castType(field, valueRaw)
                    });
                }
            }
        });

        return result;
    }
}

interface IOptions {
  Model: any;
  description?: string;
}
function FilterValidator(schema, options: IOptions) {
    const { Model, description = defaultDescription } = options;
    // const filter = new MagicSchema({}, { _id: false, id: false });

    Model.schema.eachPath((fieldName, field) => {
        if (field.options.in_filter) {
            schema.add(buildFilterField(field));
            // filter.add(buildFilterField(field));
        }
    });

    // schema.add({
    //     filter: {
    //         description,
    //         type: filter,
    //         default: undefined
    //     }
    // });

    schema.loadClass(FilterHandler);
}

export default FilterValidator;
export type TFilterValidator = FilterHandler;
