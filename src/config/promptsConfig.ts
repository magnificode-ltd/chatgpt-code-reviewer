enum Prompt {
  CHECK_PATCH,
  PREPARE_SUGGESTIONS,
}

const promptsConfig: { [key in Prompt]: string } = {
  [Prompt.CHECK_PATCH]:
    'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.',
  [Prompt.PREPARE_SUGGESTIONS]:
    'There is an array `patchData`. Every object of this array has a `patch` and `filename` properties. You should make the next steps: 1. Based on `patch` property, provide a list of suggestions how to improve the code with examples according to coding standards and best practices. 2. All suggestions should be separated by `filename`',
};

export default promptsConfig;
export { Prompt };
