import { getInput } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { encode } from 'gpt-3-encoder';
import fetch from 'node-fetch';
import { Configuration, OpenAIApi } from 'openai';
import errorsConfig, { ErrorMessage } from '../config/errorsConfig';
import promptsConfig, { Prompt } from '../config/promptsConfig';

const OPENAI_MODEL = getInput('model');
const MAX_TOKENS = 4000;

type Octokit = ReturnType<typeof getOctokit>;

type FilenameWithPatch = { filename: string; patch?: string; tokensUsed: number };

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

  private async getOpenAiSuggestionsByData(preparedData: string) {
    const { data } = await this.openAiApi.createChatCompletion({
      model: OPENAI_MODEL,
      max_tokens: MAX_TOKENS - encode(preparedData).length,
      messages: [
        { role: 'system', content: promptsConfig[Prompt.SYSTEM_PROMPT] },
        { role: 'user', content: preparedData },
      ],
    });

    let completionText = '';

    if (data.choices.length > 0) {
      const choice = data.choices[0];

      if (choice.message && choice.message.content) {
        completionText = choice.message.content;
      }
    }

    return completionText;
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

  private getFilesWithSuggestions(text: string) {
    const regex = /`([^`]+)`:\s*((?:\n\s+-[^`]+)+)/g;
    const matches = [...text.matchAll(regex)];

    const filenamesAndContents = matches.map((match) => {
      const filename = match[1];
      const content = match[2].trim().replace(/\n\s+-/g, '');

      return { filename, content };
    });

    return filenamesAndContents;
  }

  private getFilesInTokenRange(tokensRange: number, files: FilenameWithPatch[]) {
    const filesInTokenRange: FilenameWithPatch[] = [];
    const filesOutOfTokensRange: FilenameWithPatch[] = [];

    let tokensUsed = 0;

    files.forEach((file) => {
      if (tokensUsed + file.tokensUsed <= tokensRange) {
        filesInTokenRange.push(file);
        tokensUsed += file.tokensUsed;
      } else {
        filesOutOfTokensRange.push(file);
        tokensUsed = file.tokensUsed;
      }
    });

    return {
      filesInTokenRange,
      filesOutOfTokensRange,
    };
  }

  public async addCommentToPr() {
    const { files } = await this.getBranchDiff();

    if (!files) {
      throw new Error(errorsConfig[ErrorMessage.NO_CHANGED_FILES_IN_PULL_REQUEST]);
    }

    const filePatchList = files
      .filter(({ filename }) => filename.startsWith('src'))
      .map(({ filename, patch }) => ({
        filename,
        patch,
        tokensUsed: encode(patch || '').length,
      }));

    const { filesInTokenRange, filesOutOfTokensRange } = this.getFilesInTokenRange(
      MAX_TOKENS / 2,
      filePatchList
    );

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: promptsConfig[Prompt.SYSTEM_PROMPT] },
          {
            role: 'user',
            content: filesInTokenRange
              .map(({ filename, patch }) => `${filename}\n${patch}\n`)
              .join(''),
          },
        ],
      }),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    const responseJson = await response.json();

    console.log({ responseJson });

    /**
     * 1. Check how many tokens we have per file
     * 2. If there are more then 2k tokens was used - make a request
     * 3. Check every patch in every file and push it to an array until max used tokens will be reached.
     * 4. If one file will have more than 2k tokens, than what? ***
     * 5. How to deal with a different models? There are models which allow more then 4k token ***
     */

    // if (jsonDataRequest.length > MAX_TOKENS) jsonDataRequest = jsonDataRequest.slice(0, MAX_TOKENS);
  }
}

export default CommentOnPullRequestService;
