import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ResumeStatus {
    UPLOADING = 'uploading',
    PROCESSING = 'processing',
    ANALYZED = 'analyzed',
    ERROR = 'error',
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

const ResumeSchema = new Schema<IResume>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        originalFilename: { type: String, required: true },
        fileType: { type: String, enum: ['pdf', 'docx'], required: true },
        fileSize: { type: Number, required: true },
        fileKey: { type: String, required: true },
        s3Url: { type: String },
        rawText: { type: String, required: true },
        cleanedText: { type: String, required: true },
        status: { type: String, enum: Object.values(ResumeStatus), default: ResumeStatus.UPLOADING },
        isOptimized: { type: Boolean, default: false },
        optimizedText: { type: String },
        templateId: { type: String },
        tags: [{ type: String }],
    },
    { timestamps: true }
);

ResumeSchema.index({ user: 1, createdAt: -1 });
ResumeSchema.index({ status: 1 });

export const ResumeModel: Model<IResume> = mongoose.model<IResume>('Resume', ResumeSchema);
