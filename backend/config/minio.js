/**
 * MinIO Object Storage Configuration
 * Handles connection and bucket initialization
 */

const Minio = require('minio');

const BUCKET_NAME = process.env.MINIO_BUCKET || 'pemda-documents';

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

/**
 * Initialize MinIO - ensure bucket exists
 */
const initMinio = async () => {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            console.log(`✅ MinIO bucket '${BUCKET_NAME}' created`);

            // Set bucket policy to allow public read (for file downloads)
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
                    }
                ]
            };
            await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
            console.log(`✅ MinIO bucket policy set (public read)`);
        } else {
            console.log(`✅ MinIO bucket '${BUCKET_NAME}' already exists`);
        }
    } catch (error) {
        console.error('❌ MinIO initialization failed:', error.message);
        throw error;
    }
};

module.exports = { minioClient, initMinio, BUCKET_NAME };
