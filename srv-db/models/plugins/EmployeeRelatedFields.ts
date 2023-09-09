import mongoose from 'mongoose';
import CalculatedFields from './CalculatedFields';
import { TMagicSchema } from '../MagicSchema';

const employeeFields = Symbol('employeeFields');

// eslint-disable-next-line no-use-before-define
class EmployeeRelatedFieldsClass extends mongoose.Model<EmployeeRelatedFieldsClass> {
    static getEmployeeRelatedFields() {
        return Array.from(this.schema[employeeFields]);
    }
}

function EmployeeRelatedFields(schema: TMagicSchema, options = {}) {
    schema.plugin(CalculatedFields, { ...options, customFieldsList: employeeFields });

    schema.loadClass(EmployeeRelatedFieldsClass);
}

export default EmployeeRelatedFields;
export type TEmployeeRelatedFields = EmployeeRelatedFieldsClass;
export type TEmployeeRelatedFieldsStatic = typeof EmployeeRelatedFieldsClass;
