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
    getOpenAiSuggestionsByData(preparedData) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = `
      ${promptsConfig_1.default[promptsConfig_1.Prompt.PREPARE_SUGGESTIONS]}\n
      \n\n${preparedData}
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
            const patchData = files
                .map((file) => ({
                filename: file.filename,
                patch: file.patch,
            }))
                .filter(({ filename }) => filename.startsWith('src'));
            const preparedData = JSON.stringify({ patchData });
            const aiSuggestions = yield this.getOpenAiSuggestionsByData('{"patchData":[{"filename":".github/workflows/main.yml","patch":"@@ -1,6 +1,6 @@\n name: chatgpt-reviewer-github-action\n run-name: chatgpt-reviewer-github-action\n-on: [pull_request, push]\n+on: [pull_request]\n jobs:\n  chatgpt-reviewer-github-action:\n    runs-on: ubuntu-latest"},{"filename":".prettierrc.json","patch":"@@ -0,0 +1,11 @@\n+{\n+  "trailingComma": "all",\n+  "tabWidth": 2,\n+  "singleQuote": true,\n+  "printWidth": 100,\n+  "quoteProps": "as-needed",\n+  "bracketSpacing": true,\n+  "importOrder": ["^@core/(.*)$", "^@server/(.*)$", "^@ui/(.*)$", "^[./]"],\n+  "importOrderSeparation": true,\n+  "importOrderSortSpecifiers": true\n+}"},{"filename":"package-lock.json"},{"filename":"package.json","patch":"@@ -6,6 +6,7 @@\n     "@testing-library/jest-dom": "^4.2.4",\n     "@testing-library/react": "^9.3.2",\n     "@testing-library/user-event": "^7.1.2",\n+    "prettier": "^2.8.8",\n     "react": "^16.13.1",\n     "react-dom": "^16.13.1",\n     "react-icons": "^3.9.0",\n@@ -18,7 +19,8 @@\n     "start": "react-scripts start",\n     "build": "react-scripts build",\n     "test": "react-scripts test",\n         response.status === 404 ||\n-        (contentType != null && contentType.indexOf("javascript") === -1)\n+        (contentType != null && contentType.indexOf(\'javascript\') === -1)\n       ) {\n         // No service worker found. Probably a different app. Reload the page.\n         navigator.serviceWorker.ready.then((registration) => {\n@@ -122,14 +120,12 @@ function checkValidServiceWorker(swUrl, config) {\n       }\n     })\n     .catch(() => {\n-      console.log(\n-        "No internet connection found. App is running in offline mode."\n-      );\n+      console.log(\'No internet connection found. App is running in offline mode.\');\n     });\n }\n \n export function unregister() {\n-  if ("serviceWorker" in navigator) {\n+  if (\'serviceWorker\' in navigator) {\n     navigator.serviceWorker.ready\n       .then((registration) => {\n         registration.unregister();"},{"filename":"src/setupTests.js","patch":"@@ -2,4 +2,4 @@\n // allows you to do things like:\n // expect(element).toHaveTextContent(/react/i)\n // learn more: https://github.com/testing-library/jest-dom\n-import "@testing-library/jest-dom/extend-expect";\n+import \'@testing-library/jest-dom/extend-expect\';"},{"filename":"src/store/actions/todo-app.actions.jsx","patch":"@@ -1,8 +1,8 @@\n-export const ADD_TODO = "ADD_TODO";\n-export const DELETE_TODO = "DELETE_TODO";\n-export const IS_EDIT_TODO = "IS_EDIT_TODO";\n-export const EDIT_TODO = "EDIT_TODO";\n-export const COMPLETE_TODO = "COMPLETE_TODO";\n+export const ADD_TODO = \'ADD_TODO\';\n+export const DELETE_TODO = \'DELETE_TODO\';\n+export const IS_EDIT_TODO = \'IS_EDIT_TODO\';\n+export const EDIT_TODO = \'EDIT_TODO\';\n+export const COMPLETE_TODO = \'COMPLETE_TODO\';\n \n let initialId = 0;\n export function addTodo(content) {"},{"filename":"src/store/reducers/index.jsx","patch":"@@ -1,5 +1,5 @@\n-import { combineReducers } from "redux";\n-import { todoAppReducer } from "./todo-app.reducer";\n+import { combineReducers } from \'redux\';\n+import { todoAppReducer } from \'./todo-app.reducer\';\n \n const rootReducer = combineReducers({\n   todoList: todoAppReducer,"},{"filename":"src/store/reducers/todo-app.reducer.jsx","patch":"@@ -4,14 +4,12 @@ import {\n   EDIT_TODO,\n   COMPLETE_TODO,\n   IS_EDIT_TODO,\n-} from "../actions/todo-app.actions";\n+} from \'../actions/todo-app.actions\';\n \n export function todoAppReducer(state = [], action) {\n   switch (action.type) {\n     case ADD_TODO:\n-      const equals = state.filter(\n-        (item) => item.content === action.payload.content\n-      );\n+      const equals = state.filter((item) => item.content === action.payload.content);\n       if (!equals.length && action.payload.content) {\n         return [\n           ...state,\n@@ -28,21 +26,15 @@ export function todoAppReducer(state = [], action) {\n       return state.filter((item) => item.id !== action.payload.id);\n     case IS_EDIT_TODO:\n       return state.map((item) =>\n-        item.id === action.payload.id\n-          ? { ...item, editable: !item.editable }\n-          : item\n+        item.id === action.payload.id ? { ...item, editable: !item.editable } : item,\n       );\n     case EDIT_TODO:\n       return state.map((item) =>\n-        item.id === action.payload.id\n-          ? { ...item, content: action.payload.content }\n-          : item\n+        item.id === action.payload.id ? { ...item, content: action.payload.content } : item,\n       );\n     case COMPLETE_TODO:\n       return state.map((item) =>\n-        item.id === action.payload.id\n-          ? { ...item, completed: !item.completed }\n-          : item\n+        item.id === action.payload.id ? { ...item, completed: !item.completed } : item,\n       );\n     default:\n       return state;"},{"filename":"yarn.lock"}]}');
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
