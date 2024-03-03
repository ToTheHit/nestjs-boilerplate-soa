import { TFileSaver, TUploadResult } from '@srvMedia/lib/constants';
import getFileId from '@srvMedia/lib/utils/buildFileId';
import fileUpload from '@srvMedia/lib/uploader/fileUpload';
import getFileByLink from '@srvMedia/lib/utils/getFileByLink';

const fileUploadByLink = async (
    req,
    fileSaver: TFileSaver,
    allowedMimes = null
): Promise<TUploadResult> => ({
    files: await Promise.all((Array.isArray(req.body.file)
        ? [...req.body.file]
        : [req.body.file])
        .map(async fileLink => {
            const fileInfo = await getFileByLink(fileLink, 'file');
            const systemName = getFileId('upload', req.profile._id, fileInfo.filename);

            return fileUpload(fileInfo, systemName, fileSaver, allowedMimes);
        })),
    fields: {
        catalog: Array.isArray(req.body.catalog)
            ? [...req.body.catalog]
            : [req.body.catalog]
    }
});

export default fileUploadByLink;
