import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface IChatSession extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    resume?: mongoose.Types.ObjectId;
    title: string;
    messages: IChatMessage[];
    totalTokensUsed: number;
    createdAt: Date;
    updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
    {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        resume: { type: Schema.Types.ObjectId, ref: 'Resume' },
        title: { type: String, default: 'New Chat Session', maxlength: 200 },
        messages: [ChatMessageSchema],
        totalTokensUsed: { type: Number, default: 0 },
    },
    { timestamps: true }
);

ChatSessionSchema.index({ user: 1, updatedAt: -1 });

export const ChatSessionModel: Model<IChatSession> = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
