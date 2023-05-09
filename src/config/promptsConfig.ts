enum Prompt {
  Check_Patch,
}

// TODO check if this prompt improves the results or makes them worse. if it's better keep it, else remove it and remove this comment when doen.
const promptsConfig: { [key in Prompt]: string } = {
  [Prompt.Check_Patch]:
    'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.',
};

export default promptsConfig;
export { Prompt };
