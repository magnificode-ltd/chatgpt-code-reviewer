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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const gpt_3_encoder_1 = require("gpt-3-encoder");
const errorsConfig_1 = __importStar(require("../config/errorsConfig"));
const concatPatchesToSingleString_1 = __importDefault(require("./utils/concatPatchesToSingleString"));
const getFirstChangedLineFromPatch_1 = __importDefault(require("./utils/getFirstChangedLineFromPatch"));
const getOpenAiSuggestions_1 = __importDefault(require("./utils/getOpenAiSuggestions"));
const getPortionFilesByTokenRange_1 = __importDefault(require("./utils/getPortionFilesByTokenRange"));
const splitOpenAISuggestionsByFiles_1 = __importDefault(require("./utils/splitOpenAISuggestionsByFiles"));
const MAX_TOKENS = 4000;
class CommentOnPullRequestService {
    constructor() {
        var _a, _b, _c;
        if (!process.env.GITHUB_TOKEN) {
            throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.MISSING_GITHUB_TOKEN]);
        }
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.MISSING_OPENAI_TOKEN]);
        }
        if (!github_1.context.payload.pull_request) {
            throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.NO_PULLREQUEST_IN_CONTEXT]);
        }
        this.octokitApi = (0, github_1.getOctokit)(process.env.GITHUB_TOKEN);
        this.pullRequest = {
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            pullHeadRef: (_a = github_1.context.payload) === null || _a === void 0 ? void 0 : _a.pull_request.head.ref,
            pullBaseRef: (_b = github_1.context.payload) === null || _b === void 0 ? void 0 : _b.pull_request.base.ref,
            pullNumber: (_c = github_1.context.payload) === null || _c === void 0 ? void 0 : _c.pull_request.number,
        };
    }
    getBranchDiff() {
        return __awaiter(this, void 0, void 0, function* () {
            const { owner, repo, pullBaseRef, pullHeadRef } = this.pullRequest;
            const { data: branchDiff } = yield this.octokitApi.rest.repos.compareCommits({
                owner,
                repo,
                base: pullBaseRef,
                head: pullHeadRef,
            });
            return branchDiff;
        });
    }
    getLastCommit() {
        return __awaiter(this, void 0, void 0, function* () {
            const { owner, repo, pullNumber } = this.pullRequest;
            const { data: commitsList } = yield this.octokitApi.rest.pulls.listCommits({
                owner,
                repo,
                per_page: 50,
                pull_number: pullNumber,
            });
            return commitsList[commitsList.length - 1].sha;
        });
    }
    addCommentToPr() {
        return __awaiter(this, void 0, void 0, function* () {
            const { files } = yield this.getBranchDiff();
            if (!files) {
                throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.NO_CHANGED_FILES_IN_PULL_REQUEST]);
            }
            const patchesList = [];
            files
                .filter(({ filename }) => ['package.json', 'package-lock.json'].includes(filename) === false)
                .forEach(({ filename, patch }) => {
                if (patch) {
                    patchesList.push({
                        filename,
                        patch,
                        tokensUsed: (0, gpt_3_encoder_1.encode)(patch).length,
                    });
                }
            });
            const { firstPortion } = (0, getPortionFilesByTokenRange_1.default)(MAX_TOKENS / 2, patchesList);
            const getFirstPortionSuggestionsList = yield (0, getOpenAiSuggestions_1.default)((0, concatPatchesToSingleString_1.default)(firstPortion));
            const suggestionsList = (0, splitOpenAISuggestionsByFiles_1.default)(getFirstPortionSuggestionsList);
            const { owner, repo, pullNumber } = this.pullRequest;
            firstPortion.forEach((file) => __awaiter(this, void 0, void 0, function* () {
                const lastCommitId = yield this.getLastCommit();
                const firstChangedLineFromPatch = (0, getFirstChangedLineFromPatch_1.default)(file.patch);
                const suggestionByFilename = suggestionsList.find(({ filename }) => filename === file.filename);
                try {
                    yield this.octokitApi.rest.pulls.createReviewComment({
                        owner,
                        repo,
                        pull_number: pullNumber,
                        line: firstChangedLineFromPatch,
                        path: suggestionByFilename === null || suggestionByFilename === void 0 ? void 0 : suggestionByFilename.filename,
                        body: `[ChatGPTReviewer]\n${suggestionByFilename === null || suggestionByFilename === void 0 ? void 0 : suggestionByFilename.suggestion}`,
                        commit_id: lastCommitId,
                    });
                }
                catch (error) {
                    console.error('The error was occurred trying to add a comment', error);
                    throw error;
                }
            }));
            // try {
            //   const suggestion = await getOpenAiSuggestions({
            //     data: this.concatPatches(filesInTokenRange),
            //   });
            //   const { owner, repo, pullNumber } = this.pullRequest;
            //   const suggestionsByFiles = splitOpenAISuggestionsByFiles(suggestion);
            //   suggestionsByFiles.forEach(async ({ filename, suggestion }) => {
            //     const firstChangedLineFromPatch =
            //       await CommentOnPullRequestService.getFirstChangedLineFromPatch(file.patch!);
            //     const lastCommitId = await this.getLastCommit();
            //     await this.octokitApi.rest.pulls.createReviewComment({
            //       owner,
            //       repo,
            //       pull_number: pullNumber,
            //       line: firstChangedLineFromPatch,
            //       path: filename,
            //       body: `[ChatGPTReviewer]\n${suggestion}`,
            //       commit_id: lastCommitId,
            //     });
            //   });
            //   let requestCount = 1;
            //   const intervalId = setInterval(async () => {
            //     if (requestCount >= filesOutOfTokensRange.length) {
            //       clearInterval(intervalId);
            //       return;
            //     }
            //     const { filesOutOfTokensRange: newFilesOutOfTokensRange } = getPortionFilesByTokenRange(
            //       MAX_TOKENS / 2,
            //       filesOutOfTokensRange
            //     );
            //     await getOpenAiSuggestions({ data: this.concatPatches(newFilesOutOfTokensRange) });
            //     requestCount += 1;
            //   }, 60000); // Interval set to 1 minute (60,000 milliseconds)
            // } catch (error) {
            //   console.error('Error posting sequential data:', error);
            // }
            /**
             * 1. Check how many tokens we have per file
             * 2. If there are more then 2k tokens was used - make a request
             * 3. Check every patch in every file and push it to an array until max used tokens will be reached.
             * 4. If one file will have more than 2k tokens, than what? ***
             * 5. How to deal with a different models? There are models which allow more then 4k token ***
             */
            // if (jsonDataRequest.length > MAX_TOKENS) jsonDataRequest = jsonDataRequest.slice(0, MAX_TOKENS);
        });
    }
}
exports.default = CommentOnPullRequestService;
