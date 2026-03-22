import mongoose, { Document, Model } from 'mongoose';
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
export declare const ChatSessionModel: Model<IChatSession>;
//# sourceMappingURL=ChatSession.model.d.ts.map