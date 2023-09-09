import { TMagicModel } from '../models/MagicModel';

export default (Model: TMagicModel, ignoreDeletion = false) => (
    Model.is('Deletable')
        ? {
            isDeleted: ignoreDeletion ? 'ignore' : false
        }
        : {}
);
