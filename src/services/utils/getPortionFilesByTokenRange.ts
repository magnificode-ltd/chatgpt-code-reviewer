import { FilenameWithPatch } from '../types';

const getPortionFilesByTokenRange = (tokensRange: number, files: FilenameWithPatch[]) => {
  const firstPortion: FilenameWithPatch[] = [];
  const secondPortion: FilenameWithPatch[] = [];

  let tokensUsed = 0;

  files.forEach((file) => {
    if (tokensUsed + file.tokensUsed <= tokensRange) {
      firstPortion.push(file);
      tokensUsed += file.tokensUsed;
    } else {
      secondPortion.push(file);
      tokensUsed = file.tokensUsed;
    }
  });

  return {
    firstPortion,
    secondPortion,
  };
};

export default getPortionFilesByTokenRange;
