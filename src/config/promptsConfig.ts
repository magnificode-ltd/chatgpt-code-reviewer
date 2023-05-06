enum Prompt {
  Check_Patch,
}

const promptsConfig: { [key in Prompt]: string } = {
  [Prompt.Check_Patch]:
    'Based on the patch provide a list of suggestions how to improve the code with examples.',
};

export default promptsConfig;
export { Prompt };
