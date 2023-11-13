import mongoose from 'mongoose';

class MagicModel extends mongoose.Model {
    static get useBaseObject(): null | 'model' | 'object' {
        return null;
    }
}

export default MagicModel;
export type TMagicModel = MagicModel;
