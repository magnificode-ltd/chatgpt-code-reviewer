enum ErrorMessage {
  No_GitHub_Token,
  No_OpenAi_Token,
  No_PullRequest_In_Context,
  No_Patch_For_OpenAi_Suggestion,
  No_Changed_Files_In_PullRequest,
  Not_Match_Status_Of_Changed_File,
  No_Patch_File,
}

const errorsConfig: { [key in ErrorMessage]: string } = {
  [ErrorMessage.No_GitHub_Token]: 'A GitHub token must be provided to use the Octokit API.',
  [ErrorMessage.No_OpenAi_Token]:
    'An OpenAI API token must be provided to use the OpenAI API. Make sure you have add a token with a name OPENAI_API_KEY in https://github.com/{user}/{repository}/settings/secrets/actions',
  [ErrorMessage.No_PullRequest_In_Context]:
    'Pull request data must be provided, check payload and try again.',
  [ErrorMessage.No_Patch_For_OpenAi_Suggestion]:
    'The patch must be exist to provide a suggestions with Open AI',
  [ErrorMessage.No_Changed_Files_In_PullRequest]:
    'There are not any changed files in provided pull request',
  [ErrorMessage.Not_Match_Status_Of_Changed_File]:
    'The status of the file should be one of ["added", "modified", "renamed", "changed"], provided status is:',
  [ErrorMessage.No_Patch_File]: 'Patch file must be provided',
};

export default errorsConfig;
export { ErrorMessage };
