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
const github_1 = require("@actions/github");
const openai_1 = require("openai");
const errorsConfig_1 = __importStar(require("../config/errorsConfig"));
const promptsConfig_1 = __importStar(require("../config/promptsConfig"));
class CommentOnPullRequestService {
    constructor() {
        var _a, _b, _c, _d, _e, _f;
        if (!process.env.GITHUB_TOKEN) {
            throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.No_GitHub_Token]);
        }
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.No_OpenAi_Token]);
        }
        if (!github_1.context.payload.pull_request) {
            throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.No_PullRequest_In_Context]);
        }
        this._octokitApi = (0, github_1.getOctokit)(process.env.GITHUB_TOKEN);
        this._openAiApi = new openai_1.OpenAIApi(new openai_1.Configuration({ apiKey: process.env.OPENAI_API_KEY }));
        this._pullRequest = {
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            pullHead: (_b = (_a = github_1.context.payload) === null || _a === void 0 ? void 0 : _a.pull_request) === null || _b === void 0 ? void 0 : _b.head.ref,
            pullBase: (_d = (_c = github_1.context.payload) === null || _c === void 0 ? void 0 : _c.pull_request) === null || _d === void 0 ? void 0 : _d.base.ref,
            pullNumber: (_f = (_e = github_1.context.payload) === null || _e === void 0 ? void 0 : _e.pull_request) === null || _f === void 0 ? void 0 : _f.number,
        };
    }
    getBranchDiff() {
        return __awaiter(this, void 0, void 0, function* () {
            const { owner, repo, pullBase, pullHead } = this._pullRequest;
            const { data: branchDiff } = yield this._octokitApi.rest.repos.compareCommits({
                owner,
                repo,
                base: pullBase,
                head: pullHead,
            });
            return branchDiff;
        });
    }
    getCommitsList() {
        return __awaiter(this, void 0, void 0, function* () {
            const { owner, repo, pullNumber } = this._pullRequest;
            const { data: commitsList } = yield this._octokitApi.rest.pulls.listCommits({
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
                throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.No_Patch_For_OpenAi_Suggestion]);
            }
            const prompt = `
      ${promptsConfig_1.default[promptsConfig_1.Prompt.Check_Patch]}\n
      Patch:\n\n"${patch}"
    `;
            const openAIResult = yield this._openAiApi.createChatCompletion({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
            });
            const responseText = ((_b = (_a = openAIResult.data.choices.shift()) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
            return responseText;
        });
    }
    getFirstChangedLineFromThePatch(patch) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!patch) {
                throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.No_Patch_File]);
            }
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
    addCommentToPr() {
        return __awaiter(this, void 0, void 0, function* () {
            const { files } = yield this.getBranchDiff();
            if (!files) {
                throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.No_Changed_Files_In_PullRequest]);
            }
            for (const file of files) {
                const isFileStatusMatch = ['added', 'modified', 'renamed', 'changed'].includes(file.status);
                if (!isFileStatusMatch) {
                    throw new Error(`${errorsConfig_1.default[errorsConfig_1.ErrorMessage.Not_Match_Status_Of_Changed_File]} ${file.status}`);
                }
                const openAiSuggestions = yield this.getOpenAiSuggestions(file.patch);
                const commitsList = yield this.getCommitsList();
                const { owner, repo, pullNumber } = this._pullRequest;
                const firstChangedLineFromThePatch = yield this.getFirstChangedLineFromThePatch(file.patch);
                yield this._octokitApi.rest.pulls.createReviewComment({
                    owner,
                    repo,
                    pull_number: pullNumber,
                    line: firstChangedLineFromThePatch,
                    path: file.filename,
                    body: `[ChatGPTReviewer]\n${openAiSuggestions}`,
                    commit_id: commitsList[commitsList.length - 1].sha,
                });
            }
        });
    }
}
exports.default = CommentOnPullRequestService;
