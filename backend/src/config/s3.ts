import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './env';
import { logger } from './logger';

const s3Config: any = {
    region: config.AWS_REGION,
};

if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
    s3Config.credentials = {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    };
}

if (config.AWS_S3_ENDPOINT) {
    s3Config.endpoint = config.AWS_S3_ENDPOINT;
    // For MinIO/Localstack/R2 compatibility, force path style typically
    if (config.AWS_S3_ENDPOINT.includes('localhost') || config.AWS_S3_ENDPOINT.includes('127.0.0.1')) {
        s3Config.forcePathStyle = true;
    }
}

export const s3Client = new S3Client(s3Config);

/**
 * Uploads a file buffer to S3 and returns the S3 File Key
 */
export async function uploadToS3(fileBuffer: Buffer, mimetype: string, fileKey: string): Promise<string> {
    if (!config.AWS_S3_BUCKET) {
        logger.warn('AWS_S3_BUCKET is not configured. Skipping S3 upload.');
        return fileKey;
    }

    const command = new PutObjectCommand({
        Bucket: config.AWS_S3_BUCKET,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimetype,
    });

    try {
        await s3Client.send(command);
        logger.debug(`Successfully uploaded ${fileKey} to S3.`);
        return fileKey;
    } catch (err) {
        logger.error(`Failed to upload ${fileKey} to S3:`, err);
        throw new Error('S3 Upload Failed');
    }
}

/**
 * Generates a pre-signed URL to view / download a file securely from S3.
 */
export async function getSignedS3Url(fileKey: string, expiresIn = 3600): Promise<string> {
    if (!config.AWS_S3_BUCKET) {
        return '';
    }

    const command = new GetObjectCommand({
        Bucket: config.AWS_S3_BUCKET,
        Key: fileKey,
    });

    try {
        return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (err) {
        logger.error(`Failed to generate signed URL for ${fileKey}:`, err);
        return '';
    }
}

/**
 * Deletes a file from S3
 */
export async function deleteFromS3(fileKey: string): Promise<void> {
    if (!config.AWS_S3_BUCKET) return;

    const command = new DeleteObjectCommand({
        Bucket: config.AWS_S3_BUCKET,
        Key: fileKey,
    });

    try {
        await s3Client.send(command);
        logger.debug(`Successfully deleted ${fileKey} from S3.`);
    } catch (err) {
        logger.error(`Failed to delete ${fileKey} from S3:`, err);
    }
}
