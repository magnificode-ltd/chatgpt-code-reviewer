import { context, getOctokit } from '@actions/github';
import { Configuration, OpenAIApi } from 'openai';
import errorsConfig, { ErrorMessage } from '../config/errorsConfig';
import promptsConfig, { Prompt } from '../config/promptsConfig';

type Octokit = ReturnType<typeof getOctokit>;

type PullRequestInfo = {
  owner: string;
  repo: string;
  pullHeadRef: string | undefined;
  pullBaseRef: string | undefined;
  pullNumber: number | undefined;
};

class CommentOnPullRequestService {
  private readonly octokitApi: Octokit;
  private readonly openAiApi: OpenAIApi;
  private readonly pullRequestInfo: PullRequestInfo;

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

    this.pullRequestInfo = {
      owner: context.repo.owner,
      repo: context.repo.repo,
      pullHeadRef: context.payload?.pull_request?.head.ref,
      pullBaseRef: context.payload?.pull_request?.base.ref,
      pullNumber: context.payload?.pull_request?.number,
    };
  }

  private async getBranchDiff() {
    const { owner, repo, pullBaseRef, pullHeadRef } = this.pullRequestInfo;

    const { data: branchDiff } = await this.octokitApi.rest.repos.compareCommits({
      owner,
      repo,
      base: pullBaseRef,
      head: pullHeadRef,
    });

    return branchDiff;
  }

  private async getCommitsList() {
    const { owner, repo, pullNumber } = this.pullRequestInfo;

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
      // TODO Let's add support for changing the model. if someone has gpt 4 api access - he should be able to use it.
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    return openAIResult.data.choices.shift()?.message?.content || '';
  }

  private async getFirstChangedLineFromPatch(patch?: string) {
    // If we're missing a patch, we should skip the file. not throw an error and not continue with commenting on the rest of the files. fix this please and remove this error type
    if (!patch) {
      throw new Error(errorsConfig[ErrorMessage.No_Patch_File]);
    }

    const lineHeaderRegExp = /^@@ -\d+,\d+ \+(\d+),(\d+) @@/;
    const lines = patch.split('\n');
    // TODO If we have no matching lines this will crash. if this happens we should skip the file as well. (in other words - if lines = [] -> lines[0] will crash. handle that)
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

    const filesToCommentOn = files.filter(({ status }) => ['added', 'modified', 'renamed', 'changed'].includes(status));
    for (const file of filesToCommentOn) {

      // I don't think we need to throw an error when there's a file status mismatch. if we added a deleted file in a pr this won't work. check it please and remove this comment.
      // if (!isFileStatusMatch) {
      //   throw new Error(
      //     `${errorsConfig[ErrorMessage.Not_Match_Status_Of_Changed_File]} ${file.status}`
      //   );
      // }

      const openAiSuggestions = await this.getOpenAiSuggestions(file?.patch);
      const commitsList = await this.getCommitsList();

      const { owner, repo, pullNumber } = this.pullRequestInfo;

      const firstChangedLineFromPatch = await this.getFirstChangedLineFromPatch(file.patch);

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
  }
}

export default CommentOnPullRequestService;
