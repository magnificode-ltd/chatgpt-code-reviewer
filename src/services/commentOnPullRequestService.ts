import { context, getOctokit } from '@actions/github';
import { Configuration, OpenAIApi } from 'openai';
import errorsConfig, { ErrorMessage } from '../config/errorsConfig';
import promptsConfig, { Prompt } from '../config/promptsConfig';

type Octokit = ReturnType<typeof getOctokit>;

type PR_Data = {
  owner: string;
  repo: string;
  pullHead: string;
  pullBase: string;
  pullNumber: number;
};

class CommentOnPullRequestService {
  private readonly _octokitApi: Octokit;
  private readonly _openAiApi: OpenAIApi;
  private readonly _pullRequest: PR_Data;

  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error(errorsConfig[ErrorMessage.No_GitHub_Token]);
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error(errorsConfig[ErrorMessage.No_OpenAi_Token]);
    }

    if (!context.payload.pull_request) {
      throw new Error(errorsConfig[ErrorMessage.No_PullRequest_In_Context]);
    }

    this._octokitApi = getOctokit(process.env.GITHUB_TOKEN);
    this._openAiApi = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

    this._pullRequest = {
      owner: context.repo.owner,
      repo: context.repo.repo,
      pullHead: context.payload?.pull_request?.head.ref,
      pullBase: context.payload?.pull_request?.base.ref,
      pullNumber: context.payload?.pull_request?.number,
    };
  }

  private async getBranchDiff() {
    const { owner, repo, pullBase, pullHead } = this._pullRequest;

    const { data: branchDiff } = await this._octokitApi.rest.repos.compareCommits({
      owner,
      repo,
      base: pullBase,
      head: pullHead,
    });

    return branchDiff;
  }

  private async getCommitsList() {
    const { owner, repo, pullNumber } = this._pullRequest;

    const { data: commitsList } = await this._octokitApi.rest.pulls.listCommits({
      owner,
      repo,
      per_page: 50,
      pull_number: pullNumber,
    });

    return commitsList;
  }

  private async getOpenAiSuggestions(patch?: string): Promise<string> {
    if (!patch) {
      throw new Error(errorsConfig[ErrorMessage.No_Patch_For_OpenAi_Suggestion]);
    }

    const prompt = `
      ${promptsConfig[Prompt.Check_Patch]}\n
      Patch:\n\n"${patch}"
    `;

    const openAIResult = await this._openAiApi.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = openAIResult.data.choices.shift()?.message?.content || '';

    return responseText;
  }

  private async getFirstChangedLineFromThePatch(patch?: string) {
    if (!patch) {
      throw new Error(errorsConfig[ErrorMessage.No_Patch_File]);
    }

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
      throw new Error(errorsConfig[ErrorMessage.No_Changed_Files_In_PullRequest]);
    }

    for (const file of files) {
      const isFileStatusMatch: boolean = ['added', 'modified', 'renamed', 'changed'].includes(
        file.status
      );

      if (!isFileStatusMatch) {
        throw new Error(
          `${errorsConfig[ErrorMessage.Not_Match_Status_Of_Changed_File]} ${file.status}`
        );
      }

      const openAiSuggestions = await this.getOpenAiSuggestions(file.patch);
      const commitsList = await this.getCommitsList();

      const { owner, repo, pullNumber } = this._pullRequest;

      const firstChangedLineFromThePatch = await this.getFirstChangedLineFromThePatch(file.patch);

      await this._octokitApi.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: pullNumber,
        line: firstChangedLineFromThePatch,
        path: file.filename,
        body: openAiSuggestions,
        commit_id: commitsList[commitsList.length - 1].sha,
      });
    }
  }
}

export default CommentOnPullRequestService;
