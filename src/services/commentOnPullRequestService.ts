import { context, getOctokit } from '@actions/github';
import { Configuration, OpenAIApi } from 'openai';
import errorsConfig, { ErrorMessage } from '../config/errorsConfig';
import promptsConfig, { Prompt } from '../config/promptsConfig';

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

  private async getOpenAiSuggestions(patch?: string): Promise<string> {
    if (!patch) {
      throw new Error(errorsConfig[ErrorMessage.MISSING_PATCH_FOR_OPENAI_SUGGESTION]);
    }

    const prompt = `
      ${promptsConfig[Prompt.Check_Patch]}\n
      Patch:\n\n"${patch}"
    `;

    const openAIResult = await this.openAiApi.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = openAIResult.data.choices.shift()?.message?.content || '';

    return responseText;
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

  public async addCommentToPr() {
    const { files } = await this.getBranchDiff();

    if (!files) {
      throw new Error(errorsConfig[ErrorMessage.NO_CHANGED_FILES_IN_PULL_REQUEST]);
    }

    files.forEach(async (file) => {
      if (file.patch) {
        const openAiSuggestions = await this.getOpenAiSuggestions(file.patch);
        const commitsList = await this.getCommitsList();

        const { owner, repo, pullNumber } = this.pullRequest;

        const firstChangedLineFromPatch =
          await CommentOnPullRequestService.getFirstChangedLineFromPatch(file.patch);

        await this.octokitApi.rest.pulls.createReviewComment({
          owner,
          repo,
          pull_number: pullNumber,
          line: firstChangedLineFromPatch,
          path: file.filename,
          body: `[ChatGPTReviewer]\n${openAiSuggestions}`,
          commit_id: commitsList[commitsList.length - 1].sha,
        });
      }
    });
  }
}

export default CommentOnPullRequestService;
