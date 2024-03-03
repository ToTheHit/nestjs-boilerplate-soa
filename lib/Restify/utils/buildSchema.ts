import MagicSchema from '@models/MagicSchema';
import MagicModel from '@models/MagicModel';

const checkSecureField = (options = {}, type, method) => (typeof options[type] === 'object'
    ? options[type].methodToAllow !== method
    : options[type]);

interface IMagicModel {
    Model: MagicModel,
    method: string
}

const buildSchema = (Model, method) => {
    const schema = new MagicSchema({}, { _id: false, id: false });

    Model.schema.eachPath((fieldName, field) => {
        if (
            !checkSecureField(field.options, 'private', method) &&
            !checkSecureField(field.options, 'protected', method) &&
            fieldName !== '__v'
        ) {
            schema.add({
                [fieldName]: {
                    ...field.options,
                    required: method === 'create'
                        ? field.options.required || false
                        : false,
                    default: method === 'create'
                        ? field.options.default
                        : undefined
                }
            });
        }
    });

    return schema;
};

export default buildSchema;
