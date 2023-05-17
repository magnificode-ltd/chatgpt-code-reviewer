import { FilenameWithPatch } from '../types';

const concatPatchesToSingleString = (files: FilenameWithPatch[]) =>
  files.map(({ filename, patch }) => `${filename}\n${patch}\n`).join('');

export default concatPatchesToSingleString;
