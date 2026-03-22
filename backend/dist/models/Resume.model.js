"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeModel = exports.ResumeStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ResumeStatus;
(function (ResumeStatus) {
    ResumeStatus["UPLOADING"] = "uploading";
    ResumeStatus["PROCESSING"] = "processing";
    ResumeStatus["ANALYZED"] = "analyzed";
    ResumeStatus["ERROR"] = "error";
})(ResumeStatus || (exports.ResumeStatus = ResumeStatus = {}));
const ResumeSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
}, { timestamps: true });
ResumeSchema.index({ user: 1, createdAt: -1 });
ResumeSchema.index({ status: 1 });
exports.ResumeModel = mongoose_1.default.model('Resume', ResumeSchema);
//# sourceMappingURL=Resume.model.js.map