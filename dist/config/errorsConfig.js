"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessage = void 0;
var ErrorMessage;
(function (ErrorMessage) {
    ErrorMessage[ErrorMessage["No_GitHub_Token"] = 0] = "No_GitHub_Token";
    ErrorMessage[ErrorMessage["No_OpenAi_Token"] = 1] = "No_OpenAi_Token";
    ErrorMessage[ErrorMessage["No_PullRequest_In_Context"] = 2] = "No_PullRequest_In_Context";
    ErrorMessage[ErrorMessage["No_Patch_For_OpenAi_Suggestion"] = 3] = "No_Patch_For_OpenAi_Suggestion";
    ErrorMessage[ErrorMessage["No_Changed_Files_In_PullRequest"] = 4] = "No_Changed_Files_In_PullRequest";
    ErrorMessage[ErrorMessage["Not_Match_Status_Of_Changed_File"] = 5] = "Not_Match_Status_Of_Changed_File";
    ErrorMessage[ErrorMessage["No_Patch_File"] = 6] = "No_Patch_File";
})(ErrorMessage || (ErrorMessage = {}));
exports.ErrorMessage = ErrorMessage;
const errorsConfig = {
    [ErrorMessage.No_GitHub_Token]: 'A GitHub token must be provided to use the Octokit API.',
    [ErrorMessage.No_OpenAi_Token]: 'An OpenAI API token must be provided to use the OpenAI API. Make sure you have add a token with a name OPENAI_API_KEY in https://github.com/{user}/{repository}/settings/secrets/actions',
    [ErrorMessage.No_PullRequest_In_Context]: 'Pull request data must be provided, check payload and try again.',
    [ErrorMessage.No_Patch_For_OpenAi_Suggestion]: 'The patch must be exist to provide a suggestions with Open AI',
    [ErrorMessage.No_Changed_Files_In_PullRequest]: 'There are not any changed files in provided pull request',
    [ErrorMessage.Not_Match_Status_Of_Changed_File]: 'The status of the file should be one of ["added", "modified", "renamed", "changed"], provided status is:',
    [ErrorMessage.No_Patch_File]: 'Patch file must be provided',
};
exports.default = errorsConfig;
