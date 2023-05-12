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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const openai_1 = require("openai");
const errorsConfig_1 = __importStar(require("../config/errorsConfig"));
const promptsConfig_1 = __importStar(require("../config/promptsConfig"));
const OPENAI_MODEL = (0, core_1.getInput)('model');
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
        this.openAiApi = new openai_1.OpenAIApi(new openai_1.Configuration({ apiKey: process.env.OPENAI_API_KEY }));
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
    getCommitsList() {
        return __awaiter(this, void 0, void 0, function* () {
            const { owner, repo, pullNumber } = this.pullRequest;
            const { data: commitsList } = yield this.octokitApi.rest.pulls.listCommits({
                owner,
                repo,
                per_page: 50,
                pull_number: pullNumber,
            });
            return commitsList;
        });
    }
    getOpenAiSuggestions(patch) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!patch) {
                throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.MISSING_PATCH_FOR_OPENAI_SUGGESTION]);
            }
            const prompt = `
      ${promptsConfig_1.default[promptsConfig_1.Prompt.CHECK_PATCH]}\n
      Patch:\n\n"${patch}"
    `;
            const openAIResult = yield this.openAiApi.createChatCompletion({
                model: OPENAI_MODEL,
                messages: [{ role: 'user', content: prompt }],
            });
            const openAiSuggestion = ((_b = (_a = openAIResult.data.choices.shift()) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
            return openAiSuggestion;
        });
    }
    getOpenAiSuggestionsByData(patchString) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = `
      ${promptsConfig_1.default[promptsConfig_1.Prompt.PREPARE_SUGGESTIONS]}\n
      \n\n${patchString}
    `;
            const openAIResult = yield this.openAiApi.createChatCompletion({
                model: OPENAI_MODEL,
                messages: [{ role: 'user', content: prompt }],
            });
            const openAiSuggestion = ((_b = (_a = openAIResult.data.choices.shift()) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
            return openAiSuggestion;
        });
    }
    static getFirstChangedLineFromPatch(patch) {
        return __awaiter(this, void 0, void 0, function* () {
            const lineHeaderRegExp = /^@@ -\d+,\d+ \+(\d+),(\d+) @@/;
            const lines = patch.split('\n');
            const lineHeaderMatch = lines[0].match(lineHeaderRegExp);
            let lineNumber = 1;
            if (lineHeaderMatch) {
                lineNumber = parseInt(lineHeaderMatch[1], 10);
            }
            return lineNumber;
        });
    }
    createCommentByPatch({ patch, filename, lastCommitId, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const openAiSuggestions = yield this.getOpenAiSuggestions(patch);
            const { owner, repo, pullNumber } = this.pullRequest;
            const firstChangedLineFromPatch = yield CommentOnPullRequestService.getFirstChangedLineFromPatch(patch);
            yield new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before making API request
            yield this.octokitApi.rest.pulls.createReviewComment({
                owner,
                repo,
                pull_number: pullNumber,
                line: firstChangedLineFromPatch,
                path: filename,
                body: `[ChatGPTReviewer]\n${openAiSuggestions}`,
                commit_id: lastCommitId,
            });
        });
    }
    addCommentToPr() {
        return __awaiter(this, void 0, void 0, function* () {
            const { files } = yield this.getBranchDiff();
            if (!files) {
                throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.NO_CHANGED_FILES_IN_PULL_REQUEST]);
            }
            const patchString = files
                .filter(({ filename }) => filename.startsWith('src'))
                .map(({ filename, patch }) => (patch ? `${filename}\n${patch}` : ''))
                .join('\n');
            console.log(patchString);
            const aiSuggestions = yield this.getOpenAiSuggestionsByData(patchString);
            console.log({ aiSuggestions });
            // const commitsList = await this.getCommitsList();
            // const lastCommitId = commitsList[commitsList.length - 1].sha;
            // let previousPromise = Promise.resolve<any>({});
            // const commentPromisesList = files.map((file) => {
            //   if (file.patch) {
            //     previousPromise = this.createCommentByPatch({
            //       patch: file.patch,
            //       filename: file.filename,
            //       lastCommitId,
            //     });
            //   }
            //   return previousPromise;
            // });
            // commentPromisesList.forEach((promise) => {
            //   previousPromise = previousPromise.then(() => promise).catch((error) => console.error(error));
            // });
            // await Promise.all(commentPromisesList);
        });
    }
}
exports.default = CommentOnPullRequestService;
