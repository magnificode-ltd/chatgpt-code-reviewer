import { getInput } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { Configuration, OpenAIApi } from 'openai';
import errorsConfig, { ErrorMessage } from '../config/errorsConfig';
import promptsConfig, { Prompt } from '../config/promptsConfig';

const OPENAI_MODEL = getInput('model');

type Octokit = ReturnType<typeof getOctokit>;

type PullRequestInfo = {
  owner: string;
  repo: string;
  pullHeadRef: string;
  pullBaseRef: string;
  pullNumber: number;
};

class CommentOnPullRequestService {
  private readonly octokitApi: Octokit;
  private readonly openAiApi: OpenAIApi;
  private readonly pullRequest: PullRequestInfo;

  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error(errorsConfig[ErrorMessage.MISSING_GITHUB_TOKEN]);
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error(errorsConfig[ErrorMessage.MISSING_OPENAI_TOKEN]);
    }

    if (!context.payload.pull_request) {
      throw new Error(errorsConfig[ErrorMessage.NO_PULLREQUEST_IN_CONTEXT]);
    }

    this.octokitApi = getOctokit(process.env.GITHUB_TOKEN);
    this.openAiApi = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

    this.pullRequest = {
      owner: context.repo.owner,
      repo: context.repo.repo,
      pullHeadRef: context.payload?.pull_request.head.ref,
      pullBaseRef: context.payload?.pull_request.base.ref,
      pullNumber: context.payload?.pull_request.number,
    };
  }

  private async getBranchDiff() {
    const { owner, repo, pullBaseRef, pullHeadRef } = this.pullRequest;

    const { data: branchDiff } = await this.octokitApi.rest.repos.compareCommits({
      owner,
      repo,
      base: pullBaseRef,
      head: pullHeadRef,
    });

    return branchDiff;
  }

  private async getCommitsList() {
    const { owner, repo, pullNumber } = this.pullRequest;

    const { data: commitsList } = await this.octokitApi.rest.pulls.listCommits({
      owner,
      repo,
      per_page: 50,
      pull_number: pullNumber,
    });

    return commitsList;
  }

  private async getOpenAiSuggestions(patch?: string) {
    if (!patch) {
      throw new Error(errorsConfig[ErrorMessage.MISSING_PATCH_FOR_OPENAI_SUGGESTION]);
    }

    const prompt = `
      ${promptsConfig[Prompt.CHECK_PATCH]}\n
      Patch:\n\n"${patch}"
    `;

    const openAIResult = await this.openAiApi.createChatCompletion({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    const openAiSuggestion = openAIResult.data.choices.shift()?.message?.content || '';

    return openAiSuggestion;
  }

  private async getOpenAiSuggestionsByData(patchString: string) {
    const prompt = `
      ${promptsConfig[Prompt.PREPARE_SUGGESTIONS]}\n
      \n\n'src/setupTests.js\n@@ -2,4 +2,4 @@\n // allows you to do things like:\n // expect(element).toHaveTextContent(/react/i)\n // learn more: https://github.com/testing-library/jest-dom\n-import "@testing-library/jest-dom/extend-expect";\n+import \'@testing-library/jest-dom/extend-expect\';\nsrc/store/actions/todo-app.actions.jsx\n@@ -1,8 +1,8 @@\n-export const ADD_TODO = "ADD_TODO";\n-export const DELETE_TODO = "DELETE_TODO";\n-export const IS_EDIT_TODO = "IS_EDIT_TODO";\n-export const EDIT_TODO = "EDIT_TODO";\n-export const COMPLETE_TODO = "COMPLETE_TODO";\n+export const ADD_TODO = \'ADD_TODO\';\n+export const DELETE_TODO = \'DELETE_TODO\';\n+export const IS_EDIT_TODO = \'IS_EDIT_TODO\';\n+export const EDIT_TODO = \'EDIT_TODO\';\n+export const COMPLETE_TODO = \'COMPLETE_TODO\';\n \n let initialId = 0;\n export function addTodo(content) {\nsrc/store/reducers/index.jsx\n@@ -1,5 +1,5 @@\n-import { combineReducers } from "redux";\n-import { todoAppReducer } from "./todo-app.reducer";\n+import { combineReducers } from \'redux\';\n+import { todoAppReducer } from \'./todo-app.reducer\';\n \n const rootReducer = combineReducers({\n   todoList: todoAppReducer,\nsrc/store/reducers/todo-app.reducer.jsx\n@@ -4,14 +4,12 @@ import {\n   EDIT_TODO,\n   COMPLETE_TODO,\n   IS_EDIT_TODO,\n-} from "../actions/todo-app.actions";\n+} from \'../actions/todo-app.actions\';\n \n export function todoAppReducer(state = [], action) {\n   switch (action.type) {\n     case ADD_TODO:\n-      const equals = state.filter(\n-        (item) => item.content === action.payload.content\n-      );\n+      const equals = state.filter((item) => item.content === action.payload.content);\n       if (!equals.length && action.payload.content) {\n         return [\n           ...state,\n@@ -28,21 +26,15 @@ export function todoAppReducer(state = [], action) {\n       return state.filter((item) => item.id !== action.payload.id);\n     case IS_EDIT_TODO:\n       return state.map((item) =>\n-        item.id === action.payload.id\n-          ? { ...item, editable: !item.editable }\n-          : item\n+        item.id === action.payload.id ? { ...item, editable: !item.editable } : item,\n       );\n     case EDIT_TODO:\n       return state.map((item) =>\n-        item.id === action.payload.id\n-          ? { ...item, content: action.payload.content }\n-          : item\n+        item.id === action.payload.id ? { ...item, content: action.payload.content } : item,\n       );\n     case COMPLETE_TODO:\n       return state.map((item) =>\n-        item.id === action.payload.id\n-          ? { ...item, completed: !item.completed }\n-          : item\n+        item.id === action.payload.id ? { ...item, completed: !item.completed } : item,\n       );\n     default:\n       return state;'
    `;

    const openAIResult = await this.openAiApi.createChatCompletion({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    const openAiSuggestion = openAIResult.data.choices.shift()?.message?.content || '';

    return openAiSuggestion;
  }

  static async getFirstChangedLineFromPatch(patch: string) {
    const lineHeaderRegExp = /^@@ -\d+,\d+ \+(\d+),(\d+) @@/;
    const lines = patch.split('\n');
    const lineHeaderMatch = lines[0].match(lineHeaderRegExp);

    let lineNumber = 1;

    if (lineHeaderMatch) {
      lineNumber = parseInt(lineHeaderMatch[1], 10);
    }

    return lineNumber;
  }

  private async createCommentByPatch({
    patch,
    filename,
    lastCommitId,
  }: {
    patch: string;
    filename: string;
    lastCommitId: string;
  }) {
    const openAiSuggestions = await this.getOpenAiSuggestions(patch);
    const { owner, repo, pullNumber } = this.pullRequest;

    const firstChangedLineFromPatch =
      await CommentOnPullRequestService.getFirstChangedLineFromPatch(patch);

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before making API request

    await this.octokitApi.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      line: firstChangedLineFromPatch,
      path: filename,
      body: `[ChatGPTReviewer]\n${openAiSuggestions}`,
      commit_id: lastCommitId,
    });
  }

  public async addCommentToPr() {
    const { files } = await this.getBranchDiff();

    if (!files) {
      throw new Error(errorsConfig[ErrorMessage.NO_CHANGED_FILES_IN_PULL_REQUEST]);
    }

    const patchString = files
      .filter(({ filename }) => filename.startsWith('src'))
      .map(({ filename, patch }) => (patch ? `${filename}\n${patch}` : ''))
      .join('\n');

    console.log(patchString);
    const aiSuggestions = await this.getOpenAiSuggestionsByData(patchString);

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
  }
}

export default CommentOnPullRequestService;
