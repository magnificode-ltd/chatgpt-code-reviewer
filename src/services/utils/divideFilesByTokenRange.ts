import { FilenameWithPatch } from '../types';

const divideFilesByTokenRange = (tokensRange: number, files: FilenameWithPatch[]) => {
  const filesInFirstPortion: FilenameWithPatch[] = [];
  const filesInSecondPortion: FilenameWithPatch[] = [];

  let totalTokensUsed = 0;

  for (const file of files) {
    if (totalTokensUsed + file.tokensUsed <= tokensRange) {
      filesInFirstPortion.push(file);
      totalTokensUsed += file.tokensUsed;
    } else {
      filesInSecondPortion.push(file);
      break;
    }
  }

  return {
    filesInFirstPortion,
    filesInSecondPortion,
  };
};

export default divideFilesByTokenRange;
