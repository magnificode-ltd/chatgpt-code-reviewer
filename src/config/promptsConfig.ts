enum Prompt {
  Check_Patch,
}

const promptsConfig: { [key in Prompt]: string } = {
  [Prompt.Check_Patch]:
    'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.',
};

export default promptsConfig;
export { Prompt };
