import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import MagicModel from '@models/MagicModel';
import MagicSchema from '@models/MagicSchema';
import { SchemaType, Schema } from 'mongoose';

type Extra = {
    enumValues?: any[]
}
type TRequired = {
    required?: boolean
}

const getSchema = (MagicData: MagicSchema | MagicModel | Schema): { [key: string]: SchemaType } => {
    if (MagicData instanceof MagicSchema || MagicData instanceof Schema) {
        return MagicData.paths;
    }

    return MagicData.schema.paths;
};

const prepareSchema = (MagicData: MagicSchema | MagicModel | Schema): SchemaObject => {
    const schemaModel = Array.isArray(MagicData) ? getSchema(MagicData[0]) : getSchema(MagicData);

    const properties = {};
    const required: string[] = [];

    for (const key in schemaModel) {
        if (schemaModel[key].options.private) {
            // eslint-disable-next-line no-continue
            continue;
        }
        // eslint-disable-next-line no-use-before-define
        properties[key] = prepareField(schemaModel[key]);
        if (properties[key].required === true) {
            required.push(key);
        }
    }

    return {
        type: Array.isArray(MagicData) ? 'array' : 'object',
        properties,
        required
    };
};

const prepareField = (field: SchemaType & Extra): SchemaObject => {
    const result: SchemaObject & TRequired = {
        type: field.instance?.toLowerCase(),
        enum: field.enumValues,
        default: field.options.default,
        description: field.options.description,
        maxLength: field.options.maxLength || field.options.maxlength,
        minLength: field.options.minLength || field.options.minlength,
        maximum: field.options.max,
        minimum: field.options.min,
        readOnly: field.options.protected,
        required: field.options.required
    };

    if (field instanceof MagicSchema.Types.Array) {
        // Примитивы
        if (field.caster.instance) {
            result.items = {
                type: field.caster.instance,
                enum: field.caster.options.enum || field.options.enum
            };
        } else {
            result.items = prepareSchema(field.caster.schema);
            result.items.enum = field.options.enum;
        }
    } else if (field.instance === 'Embedded') {
        Object.assign(result, prepareSchema(field.schema));
    }

    if (typeof result.default === 'function') {
        result.default = null;
    }

    return result;
};

export default prepareSchema;
