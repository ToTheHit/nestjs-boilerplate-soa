import { Stream, Readable } from 'stream';
import * as AWS from 'aws-sdk'; // TODO: Update this to the latest version
import { ListBucketsOutput } from 'aws-sdk/clients/s3';
import { ManagedUpload } from 'aws-sdk/lib/s3/managed_upload';

import FileStorageInterface from '@srvMedia/lib/integration/base/FileStorageInterface';
import loggerRaw from '@lib/logger';

const logger = loggerRaw('S3Storage');
const bucketName = container => `demo.${container}`;

const headersMap = new Map([
    ['contentType', 'ResponseContentType'],
    ['contentDisposition', 'ResponseContentDisposition']
]);

class S3Storage extends FileStorageInterface {
    private endpoint: any;

    private region: any;

    constructor(publicKey, secretKey, endpoint, region, logging = false) {
        super(publicKey, secretKey, logging);

        this.endpoint = endpoint;
        this.region = region;
    }

    blobServiceBuilder() {
        return new AWS.S3({
            endpoint: this.endpoint,
            accessKeyId: this.publicKey,
            secretAccessKey: this.secretKey,
            region: this.region
        });
    }

    async initStorage(containers) {
        const service = this.blobServiceBuilder();

        const ListBuckets: ListBucketsOutput = await new Promise((res, rej) => {
            service.listBuckets((err, data) => (err
                ? rej(err)
                : res(data)));
        });
        const { Buckets: list } = ListBuckets;

        await Promise.all(containers.filter(container => (
            typeof list.find(({ Name }) => Name === bucketName(container)) === 'undefined'
        ))
            .map(container => new Promise(res => {
                service.createBucket({
                    ACL: 'private',
                    Bucket: bucketName(container)
                }, () => res(true));
            })));

        if (this.logging) {
            if (typeof list.find(({ Name }) => Name === bucketName('logs')) === 'undefined') {
                await new Promise(res => {
                    service.createBucket({
                        ACL: 'private',
                        Bucket: bucketName('logs')
                    }, () => res(true));
                });
            }

            await Promise.all(containers.map(container => (
                new Promise(res => {
                    service.putBucketLogging({
                        Bucket: bucketName(container),
                        BucketLoggingStatus: {
                            LoggingEnabled: {
                                TargetBucket: bucketName('logs'),
                                TargetPrefix: `${bucketName(container)}/`
                            }
                        }
                    }, (err, data) => {
                        if (err) {
                            logger.error('err', err);
                        } else {
                            res(data);
                        }
                    });
                })
            )));
        }
    }

    getFile(container: string, blobName: string, headers = {}, expire: number = null) {
        const params = {
            Bucket: bucketName(container),
            Key: blobName
        };

        if (expire) {
            Object.assign(params, { Expires: expire });
        }

        for (const [key, translate] of headersMap) {
            if (headers[key]) {
                Object.assign(params, { [translate]: headers[key] });
            }
        }

        return this.blobServiceBuilder()
            .getSignedUrl('getObject', params);
    }

    async streamFile(container: string, blobName: string) {
        const params = {
            Bucket: bucketName(container),
            Key: blobName
        };

        return this.blobServiceBuilder()
            .getObject(params)
            .createReadStream();
    }

    async saveFile(container: string, blobName: string, fileStream: Stream): Promise<ManagedUpload.SendData> {
        const service = this.blobServiceBuilder();

        const uploadStream = () => {
            const pass = new Stream.PassThrough();

            const params = {
                Bucket: bucketName(container),
                Key: blobName,
                Body: pass
            };

            return {
                writeStream: pass,
                promise: service.upload(params)
                    .promise()
            };
        };

        const {
            writeStream,
            promise
        } = uploadStream();

        fileStream.pipe(writeStream);

        return promise;
        /*        const params = {
            Bucket: bucketName(container),
            Key: blobName,
            Body: fileStream
        };

        return new Promise((resolve, rej) => {
            fileStream.on('error', rej);
            service.upload(params, (err, data) => (err ? rej(err) : resolve(data)));
        }); */
    }

    async checkFile(container: string, blobName: string): Promise<boolean> {
        if (process.env.NODE_ENV === 'test') {
            return true;
        }

        const service = this.blobServiceBuilder();

        const params = {
            Bucket: bucketName(container),
            Key: blobName
        };

        return new Promise(resolve => {
            service.headObject(params, err => resolve(err === null));
        });
    }

    async copyFile(
        containerSource: string,
        blobSourceName: string,
        containerTarget: string,
        blobTargetName: string
    ): Promise<boolean> {
        const service = this.blobServiceBuilder();

        const params = {
            Bucket: bucketName(containerTarget),
            Key: blobTargetName,
            CopySource: encodeURI([bucketName(containerSource), blobSourceName].join('/'))
        };

        return new Promise(resolve => {
            service.copyObject(params, err => resolve(err === null));
        });
    }

    async deleteFile(containerSource: string, blobSourceName: string): Promise<boolean> {
        const service = this.blobServiceBuilder();
        const params = {
            Bucket: bucketName(containerSource),
            Key: blobSourceName
        };

        return new Promise(resolve => {
            service.deleteObject(params, err => resolve(err === null));
        });
    }
}

export default S3Storage;
