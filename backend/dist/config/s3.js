"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
exports.uploadToS3 = uploadToS3;
exports.getSignedS3Url = getSignedS3Url;
exports.deleteFromS3 = deleteFromS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const env_1 = require("./env");
const logger_1 = require("./logger");
const s3Config = {
    region: env_1.config.AWS_REGION,
};
if (env_1.config.AWS_ACCESS_KEY_ID && env_1.config.AWS_SECRET_ACCESS_KEY) {
    s3Config.credentials = {
        accessKeyId: env_1.config.AWS_ACCESS_KEY_ID,
        secretAccessKey: env_1.config.AWS_SECRET_ACCESS_KEY,
    };
}
if (env_1.config.AWS_S3_ENDPOINT) {
    s3Config.endpoint = env_1.config.AWS_S3_ENDPOINT;
    // For MinIO/Localstack/R2 compatibility, force path style typically
    if (env_1.config.AWS_S3_ENDPOINT.includes('localhost') || env_1.config.AWS_S3_ENDPOINT.includes('127.0.0.1')) {
        s3Config.forcePathStyle = true;
    }
}
exports.s3Client = new client_s3_1.S3Client(s3Config);
/**
 * Uploads a file buffer to S3 and returns the S3 File Key
 */
async function uploadToS3(fileBuffer, mimetype, fileKey) {
    if (!env_1.config.AWS_S3_BUCKET) {
        logger_1.logger.warn('AWS_S3_BUCKET is not configured. Skipping S3 upload.');
        return fileKey;
    }
    const command = new client_s3_1.PutObjectCommand({
        Bucket: env_1.config.AWS_S3_BUCKET,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimetype,
    });
    try {
        await exports.s3Client.send(command);
        logger_1.logger.debug(`Successfully uploaded ${fileKey} to S3.`);
        return fileKey;
    }
    catch (err) {
        logger_1.logger.error(`Failed to upload ${fileKey} to S3:`, err);
        throw new Error('S3 Upload Failed');
    }
}
/**
 * Generates a pre-signed URL to view / download a file securely from S3.
 */
async function getSignedS3Url(fileKey, expiresIn = 3600) {
    if (!env_1.config.AWS_S3_BUCKET) {
        return '';
    }
    const command = new client_s3_1.GetObjectCommand({
        Bucket: env_1.config.AWS_S3_BUCKET,
        Key: fileKey,
    });
    try {
        return await (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, { expiresIn });
    }
    catch (err) {
        logger_1.logger.error(`Failed to generate signed URL for ${fileKey}:`, err);
        return '';
    }
}
/**
 * Deletes a file from S3
 */
async function deleteFromS3(fileKey) {
    if (!env_1.config.AWS_S3_BUCKET)
        return;
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: env_1.config.AWS_S3_BUCKET,
        Key: fileKey,
    });
    try {
        await exports.s3Client.send(command);
        logger_1.logger.debug(`Successfully deleted ${fileKey} from S3.`);
    }
    catch (err) {
        logger_1.logger.error(`Failed to delete ${fileKey} from S3:`, err);
    }
}
//# sourceMappingURL=s3.js.map