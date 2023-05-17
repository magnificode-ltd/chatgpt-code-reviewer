enum Prompt {
  CHECK_PATCH,
  SYSTEM_PROMPT,
}

const promptsConfig: { [key in Prompt]: string } = {
  [Prompt.CHECK_PATCH]:
    'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.',
  [Prompt.SYSTEM_PROMPT]:
    'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.\nStart every suggestion with path to the file. Path to the file should start with @@ and end with @@',
};

export default promptsConfig;
export { Prompt };
