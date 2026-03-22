"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = exports.deleteResumeVector = exports.indexResume = exports.indexJob = exports.findMatchingJobs = void 0;
/**
 * Matching Domain - barrel export
 * Encapsulates all services related to AI-powered semantic job matching
 */
var vectorSearch_service_1 = require("../../services/vectorSearch.service");
Object.defineProperty(exports, "findMatchingJobs", { enumerable: true, get: function () { return vectorSearch_service_1.findMatchingJobs; } });
Object.defineProperty(exports, "indexJob", { enumerable: true, get: function () { return vectorSearch_service_1.indexJob; } });
Object.defineProperty(exports, "indexResume", { enumerable: true, get: function () { return vectorSearch_service_1.indexResume; } });
Object.defineProperty(exports, "deleteResumeVector", { enumerable: true, get: function () { return vectorSearch_service_1.deleteResumeVector; } });
var embedding_service_1 = require("../../services/embedding.service");
Object.defineProperty(exports, "generateEmbedding", { enumerable: true, get: function () { return embedding_service_1.generateEmbedding; } });
//# sourceMappingURL=index.js.map