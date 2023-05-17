const splitOpenAISuggestionsByFiles = (text: string) => {
  const regex = /(\S+):([\s\S]*?)(?=\n\n\S+|$)/g;
  const matches = text.matchAll(regex);

  const result: { filename: string; suggestion: string }[] = [];

  for (const match of matches) {
    const [, filename, suggestion] = match;
    result.push({ filename, suggestion });
  }

  return result;
};

export default splitOpenAISuggestionsByFiles;
