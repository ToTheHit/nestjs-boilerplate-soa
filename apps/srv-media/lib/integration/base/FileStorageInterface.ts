import { Readable, Stream } from 'stream';
import { ManagedUpload } from 'aws-sdk/lib/s3/managed_upload';

class FileStorageInterface {
    protected publicKey: any;

    protected secretKey: any;

    protected logging: boolean;

    constructor(publicKey, secretKey, logging = false) {
        this.publicKey = publicKey;
        this.secretKey = secretKey;
        this.logging = logging;
    }

    blobServiceBuilder() {
        throw new Error('NOT IMPLEMENTED');
    }

    async initStorage(containers) {
        throw new Error('NOT IMPLEMENTED');
    }

    getFile(container:string, blobName:string, headers = {}, expire = null) {
        throw new Error('NOT IMPLEMENTED');
    }

    async streamFile(container:string, blobName:string): Promise<Readable> {
        throw new Error('NOT IMPLEMENTED');
    }

    async saveFile(container:string, blobName:string, fileStream: Stream): Promise<ManagedUpload.SendData> {
        throw new Error('NOT IMPLEMENTED');
    }

    async checkFile(container:string, blobName:string): Promise<boolean> {
        throw new Error('NOT IMPLEMENTED');
    }

    async copyFile(
        containerSource: string,
        blobSourceName: string,
        containerTarget: string,
        blobTargetName: string
    ): Promise<boolean> {
        throw new Error('NOT IMPLEMENTED');
    }

    async deleteFile(containerSource: string, blobSourceName: string): Promise<boolean> {
        throw new Error('NOT IMPLEMENTED');
    }
}

export default FileStorageInterface;
