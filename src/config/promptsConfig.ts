enum Prompt {
  CHECK_PATCH,
  SYSTEM_PROMPT,
}

const promptsConfig: { [key in Prompt]: string } = {
  [Prompt.CHECK_PATCH]:
    'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.',
  [Prompt.SYSTEM_PROMPT]:
    'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices. Additionally, split suggestions by filenames using a pattern `@@ filename @@`',
};

export default promptsConfig;
export { Prompt };
