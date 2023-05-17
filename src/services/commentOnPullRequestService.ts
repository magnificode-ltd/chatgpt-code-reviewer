import { context, getOctokit } from '@actions/github';
import { encode } from 'gpt-3-encoder';
import errorsConfig, { ErrorMessage } from '../config/errorsConfig';
import { FilenameWithPatch, Octokit, PullRequestInfo } from './types';
import concatPatchesToSingleString from './utils/concatPatchesToSingleString';
import getFirstChangedLineFromPatch from './utils/getFirstChangedLineFromPatch';
import getOpenAiSuggestions from './utils/getOpenAiSuggestions';
import getPortionFilesByTokenRange from './utils/getPortionFilesByTokenRange';
import splitOpenAISuggestionsByFiles from './utils/splitOpenAISuggestionsByFiles';

const MAX_TOKENS = 4000;

class CommentOnPullRequestService {
  private readonly octokitApi: Octokit;
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

  private async getLastCommit() {
    const { owner, repo, pullNumber } = this.pullRequest;

    const { data: commitsList } = await this.octokitApi.rest.pulls.listCommits({
      owner,
      repo,
      per_page: 50,
      pull_number: pullNumber,
    });

    return commitsList[commitsList.length - 1].sha;
  }

  private async createReviewComments(files: FilenameWithPatch[]) {
    const getFirstPortionSuggestionsList = await getOpenAiSuggestions(
      concatPatchesToSingleString(files)
    );

    const suggestionsList = splitOpenAISuggestionsByFiles(getFirstPortionSuggestionsList);
    const { owner, repo, pullNumber } = this.pullRequest;
    const lastCommitId = await this.getLastCommit();

    for (const file of files) {
      const firstChangedLineFromPatch = getFirstChangedLineFromPatch(file.patch);
      const suggestionByFilename = suggestionsList.find(
        (suggestion) => suggestion.filename === file.filename
      );

      if (suggestionByFilename) {
        try {
          console.time(`createReviewComment for file: ${file.filename}`);

          await this.octokitApi.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number: pullNumber,
            line: firstChangedLineFromPatch,
            path: suggestionByFilename.filename,
            body: `[ChatGPTReviewer]\n${suggestionByFilename.suggestion}`,
            commit_id: lastCommitId,
          });

          console.log('comment was created successfully');
          console.timeEnd(`createReviewComment for file: ${file.filename}`);
        } catch (error) {
          console.error('The error was occurred trying to add a comment', error);
          throw error;
        }
      }
    }
  }

  public async addCommentToPr() {
    const { files } = await this.getBranchDiff();

    if (!files) {
      throw new Error(errorsConfig[ErrorMessage.NO_CHANGED_FILES_IN_PULL_REQUEST]);
    }

    const patchesList: FilenameWithPatch[] = [];

    files.forEach(({ filename, patch }) => {
      if (patch && encode(patch).length <= MAX_TOKENS / 2) {
        patchesList.push({
          filename,
          patch,
          tokensUsed: encode(patch).length,
        });
      }
    });

    const { firstPortion, secondPortion } = getPortionFilesByTokenRange(
      MAX_TOKENS / 2,
      patchesList
    );

    await this.createReviewComments(firstPortion);

    let requestCount = 1;

    const intervalId = setInterval(async () => {
      if (requestCount >= secondPortion.length) {
        clearInterval(intervalId);
        return;
      }

      await this.createReviewComments(secondPortion);
      requestCount += 1;
    }, 60000);
  }
}

export default CommentOnPullRequestService;
