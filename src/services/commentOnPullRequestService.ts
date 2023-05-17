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

  public async addCommentToPr() {
    const { files } = await this.getBranchDiff();

    if (!files) {
      throw new Error(errorsConfig[ErrorMessage.NO_CHANGED_FILES_IN_PULL_REQUEST]);
    }

    const patchesList: FilenameWithPatch[] = [];

    files
      .filter(({ filename }) => ['package.json', 'package-lock.json'].includes(filename) === false)
      .forEach(({ filename, patch }) => {
        if (patch) {
          patchesList.push({
            filename,
            patch,
            tokensUsed: encode(patch).length,
          });
        }
      });

    const { firstPortion } = getPortionFilesByTokenRange(MAX_TOKENS / 2, patchesList);

    const getFirstPortionSuggestionsList = await getOpenAiSuggestions(
      concatPatchesToSingleString(firstPortion)
    );

    const suggestionsList = splitOpenAISuggestionsByFiles(getFirstPortionSuggestionsList);
    const { owner, repo, pullNumber } = this.pullRequest;
    const lastCommitId = await this.getLastCommit();

    for (const file of firstPortion) {
      const firstChangedLineFromPatch = getFirstChangedLineFromPatch(file.patch);
      const suggestionByFilename = suggestionsList.find(
        ({ filename }) => filename === file.filename
      );

      if (suggestionByFilename) {
        try {
          console.log('trying to create comment');
          console.time('createReviewComment');
          await this.octokitApi.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number: pullNumber,
            line: firstChangedLineFromPatch,
            path: suggestionByFilename.filename,
            body: `[ChatGPTReviewer]\n${suggestionByFilename.suggestion}`,
            // body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec aliquam nunc ante, vel pulvinar urna bibendum vel. Donec fermentum vulputate magna, at auctor justo aliquam a. Phasellus quis libero sodales, egestas ligula ut, facilisis nisl. Suspendisse et augue libero. Ut id vulputate turpis. Pellentesque quis dui ante. In elementum quis tellus at semper. Mauris dapibus risus et commodo placerat. Proin porttitor pharetra urna id convallis. Aenean in diam in quam porttitor bibendum. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Aliquam mattis odio ut dolor laoreet fringilla. Nulla vitae sagittis libero, eu tincidunt elit. Donec finibus dui vel turpis tempor rutrum. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Donec non tristique neque. Vestibulum volutpat convallis leo vitae facilisis. Ut bibendum magna a accumsan malesuada. Maecenas auctor faucibus quam a tincidunt. Mauris ac purus felis. Suspendisse potenti. Proin sodales justo a risus pharetra sodales. Proin nibh mauris, condimentum pharetra dictum id, sollicitudin eu dolor. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Vivamus rutrum enim sapien, in iaculis erat convallis ac. Pellentesque imperdiet nibh eget lorem scelerisque, ut tincidunt nisl egestas. Sed eu sem eget arcu hendrerit pellentesque in non sapien. Aenean pretium eget elit non aliquet. Morbi eleifend venenatis tincidunt. Vivamus rhoncus sapien sed finibus efficitur. Maecenas elementum leo sem, eu molestie nisl aliquet ac. Cras sed laoreet ante. Proin in leo felis. Etiam nec volutpat tellus. Nulla ac lectus euismod, ultricies ipsum nec, bibendum est. Praesent aliquet tincidunt justo, facilisis rutrum orci hendrerit ac. Vivamus quis diam eu quam ornare malesuada id ultricies enim.',
            commit_id: lastCommitId,
          });
          console.log('comment was created successfully');
          console.timeEnd('createReviewComment');
        } catch (error) {
          console.error('The error was occurred trying to add a comment', error);
          throw error;
        }
      }
    }

    // try {
    //   const suggestion = await getOpenAiSuggestions({
    //     data: this.concatPatches(filesInTokenRange),
    //   });

    //   const { owner, repo, pullNumber } = this.pullRequest;

    //   const suggestionsByFiles = splitOpenAISuggestionsByFiles(suggestion);

    //   suggestionsByFiles.forEach(async ({ filename, suggestion }) => {
    //     const firstChangedLineFromPatch =
    //       await CommentOnPullRequestService.getFirstChangedLineFromPatch(file.patch!);
    //     const lastCommitId = await this.getLastCommit();

    //     await this.octokitApi.rest.pulls.createReviewComment({
    //       owner,
    //       repo,
    //       pull_number: pullNumber,
    //       line: firstChangedLineFromPatch,
    //       path: filename,
    //       body: `[ChatGPTReviewer]\n${suggestion}`,
    //       commit_id: lastCommitId,
    //     });
    //   });

    //   let requestCount = 1;
    //   const intervalId = setInterval(async () => {
    //     if (requestCount >= filesOutOfTokensRange.length) {
    //       clearInterval(intervalId);
    //       return;
    //     }

    //     const { filesOutOfTokensRange: newFilesOutOfTokensRange } = getPortionFilesByTokenRange(
    //       MAX_TOKENS / 2,
    //       filesOutOfTokensRange
    //     );

    //     await getOpenAiSuggestions({ data: this.concatPatches(newFilesOutOfTokensRange) });
    //     requestCount += 1;
    //   }, 60000); // Interval set to 1 minute (60,000 milliseconds)
    // } catch (error) {
    //   console.error('Error posting sequential data:', error);
    // }
  }
}

export default CommentOnPullRequestService;
