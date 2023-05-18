import { getOctokit } from '@actions/github';

type Octokit = ReturnType<typeof getOctokit>;

type FilenameWithPatch = {
  filename: string;
  patch: string;
  tokensUsed: number;
};

type PullRequestInfo = {
  owner: string;
  repo: string;
  pullHeadRef: string;
  pullBaseRef: string;
  pullNumber: number;
};

export type { Octokit, FilenameWithPatch, PullRequestInfo };
