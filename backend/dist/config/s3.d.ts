import { S3Client } from '@aws-sdk/client-s3';
export declare const s3Client: S3Client;
/**
 * Uploads a file buffer to S3 and returns the S3 File Key
 */
export declare function uploadToS3(fileBuffer: Buffer, mimetype: string, fileKey: string): Promise<string>;
/**
 * Generates a pre-signed URL to view / download a file securely from S3.
 */
export declare function getSignedS3Url(fileKey: string, expiresIn?: number): Promise<string>;
/**
 * Deletes a file from S3
 */
export declare function deleteFromS3(fileKey: string): Promise<void>;
//# sourceMappingURL=s3.d.ts.map