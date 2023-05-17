import { FilenameWithPatch } from '../types';

const getPortionFilesByTokenRange = (tokensRange: number, files: FilenameWithPatch[]) => {
  const firstPortion: FilenameWithPatch[] = [];
  const secondPortion: FilenameWithPatch[] = [];

  let tokensUsed = 0;

  for (const file of files) {
    if (tokensUsed + file.tokensUsed <= tokensRange) {
      firstPortion.push(file);
      tokensUsed += file.tokensUsed;
    } else {
      secondPortion.push(file);
      break;
    }
  }

  return {
    firstPortion,
    secondPortion,
  };
};

export default getPortionFilesByTokenRange;
