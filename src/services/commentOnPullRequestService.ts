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
      ${promptsConfig[Prompt.Check_Patch]}\n
      Patch:\n\n"${patch}"
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

    return this.octokitApi.rest.pulls.createReviewComment({
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

    const commitsList = await this.getCommitsList();
    const lastCommitId = commitsList[commitsList.length - 1].sha;

    const commentPromisesList = files
      .map(async (file) => {
        if (file.patch) {
          return this.createCommentByPatch({
            patch: file.patch,
            filename: file.filename,
            lastCommitId,
          });
        }
        return false;
      })
      .filter(Boolean);

    let previousPromise = Promise.resolve<any>({});

    commentPromisesList.forEach((promise) => {
      previousPromise = previousPromise.then(() => promise).catch((error) => console.error(error));
    });

    await previousPromise;
  }
}

export default CommentOnPullRequestService;
