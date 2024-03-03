import MagicSchema from '@models/MagicSchema';
import { TFileStatic, TFileStorage } from '@srvMedia/files/fileStorage';
import { TUser } from '@srvAuth/user';

const createUserFs = async ({ data }) => {
    const {
        _profileId
    } = data;

    const User = MagicSchema.model('user');
    const FileStorage: TFileStatic = MagicSchema.model('fs');
    const user: TUser = await User.findOne({ _id: _profileId });

    const fileStorage: TFileStorage = await FileStorage.create({
        _id: new MagicSchema.ObjectId(),
        _userId: user._id,
        _createdBy: user._id,
        _creatorProfile: User.modelName
    });

    const rootCatalog = await FileStorage.createRootCatalog(fileStorage, user);

    await User.updateOne(
        { _id: _profileId },
        {
            $set: {
                _catalogId: rootCatalog._id,
                _fsId: fileStorage._id
            }
        }
    );
};

export default createUserFs;
