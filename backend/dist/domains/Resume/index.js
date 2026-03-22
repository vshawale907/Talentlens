"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.resumeService = exports.ResumeStatus = exports.ResumeModel = void 0;
/**
 * Resume Domain - barrel export
 * Encapsulates all types, models and services related to Resume processing
 */
var Resume_model_1 = require("../../models/Resume.model");
Object.defineProperty(exports, "ResumeModel", { enumerable: true, get: function () { return Resume_model_1.ResumeModel; } });
Object.defineProperty(exports, "ResumeStatus", { enumerable: true, get: function () { return Resume_model_1.ResumeStatus; } });
var resume_service_1 = require("../../services/resume.service");
Object.defineProperty(exports, "resumeService", { enumerable: true, get: function () { return resume_service_1.resumeService; } });
var resume_service_2 = require("../../services/resume.service");
Object.defineProperty(exports, "upload", { enumerable: true, get: function () { return resume_service_2.upload; } });
//# sourceMappingURL=index.js.map