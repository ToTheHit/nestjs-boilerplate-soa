import mongoose from 'mongoose';

class MagicModel extends mongoose.Model {
    static useBaseObject(): null | 'model' | 'object' {
        return null;
    }
}

export default MagicModel;
export type TMagicModel = MagicModel;
