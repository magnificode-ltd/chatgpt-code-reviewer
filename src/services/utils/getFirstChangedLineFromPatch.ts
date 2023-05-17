const getFirstChangedLineFromPatch = (patch: string) => {
  const lineHeaderRegExp = /^@@ -\d+,\d+ \+(\d+),(\d+) @@/;
  const lines = patch.split('\n');
  const lineHeaderMatch = lines[0].match(lineHeaderRegExp);

  let lineNumber = 1;

  if (lineHeaderMatch) {
    lineNumber = parseInt(lineHeaderMatch[1], 10);
  }

  return lineNumber;
};

export default getFirstChangedLineFromPatch;
