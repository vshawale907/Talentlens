import multer from 'multer';
export declare const upload: multer.Multer;
export declare const resumeService: {
    upload: (userId: string, file: Express.Multer.File, title?: string) => Promise<import("mongoose").Document<unknown, {}, import("../models/Resume.model").IResume, {}, {}> & import("../models/Resume.model").IResume & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    analyze: (resumeId: string, userId: string, jobDescriptionText?: string) => Promise<{}>;
    getByUser: (userId: string, page?: number, limit?: number) => Promise<{
        resumes: (import("mongoose").FlattenMaps<import("../models/Resume.model").IResume> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
    }>;
    delete: (resumeId: string, userId: string) => Promise<void>;
};
//# sourceMappingURL=resume.service.d.ts.map