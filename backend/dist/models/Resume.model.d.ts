import mongoose, { Document, Model } from 'mongoose';
export declare enum ResumeStatus {
    UPLOADING = "uploading",
    PROCESSING = "processing",
    ANALYZED = "analyzed",
    ERROR = "error"
}
export interface IResume extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    title: string;
    originalFilename: string;
    fileType: 'pdf' | 'docx';
    fileSize: number;
    fileKey: string;
    s3Url?: string;
    rawText: string;
    cleanedText: string;
    status: ResumeStatus;
    isOptimized: boolean;
    optimizedText?: string;
    templateId?: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const ResumeModel: Model<IResume>;
//# sourceMappingURL=Resume.model.d.ts.map