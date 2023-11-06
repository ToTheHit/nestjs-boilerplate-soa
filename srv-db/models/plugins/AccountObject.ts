import MagicSchema from '../MagicSchema';
import MagicObject from './MagicObject';

interface IOptions {
    privateParams?: boolean,
    isRequired?: boolean,
    incomeDataModifierMethods?: []
}
function AccountObject(schema, options: IOptions) {
    const {
        privateParams = false,
        isRequired = true,
        incomeDataModifierMethods = []
    } = options;
    const types = incomeDataModifierMethods.length ? incomeDataModifierMethods : ['read', 'create'];

    schema.add({
        _owner: {
            type: MagicSchema.Types.ObjectId,
            required: isRequired,
            description: 'Идентификатор аккаунта пользователя, являющегося хозяином объекта.',
            ref: 'user',
            search: { index: 'inner' },
            private: privateParams
        }
    });
    schema.index({ _owner: 1 });

    schema.plugin(MagicObject, options);

    schema.modifyIncomeData(types, (Model, profile) => ({ _owner: profile._id }));
}

export default AccountObject;
