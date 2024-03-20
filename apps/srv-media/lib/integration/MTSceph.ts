import S3Storage from '@srvMedia/lib/integration/base/S3Storage';

class MTSceph extends S3Storage {
    constructor(publicKey, secretKey, logging = false) {
        super(publicKey, secretKey, '', 'ru-central1', logging);
    }
}

export default MTSceph;
