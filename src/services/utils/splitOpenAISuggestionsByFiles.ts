const splitOpenAISuggestionsByFiles = (text: string) => {
  console.log({ suggestion: text });

  const regex = /`([^`]+)`:\s*((?:\n\s+-[^`]+)+)/g;
  const matches = [...text.matchAll(regex)];

  const filenamesAndContents = matches.map((match) => {
    const filename = match[1];
    const suggestion = match[2].trim().replace(/\n\s+-/g, '');

    return { filename, suggestion };
  });

  return filenamesAndContents;
};

export default splitOpenAISuggestionsByFiles;
