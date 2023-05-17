"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const concatPatchesToSingleString = (files) => files.map(({ filename, patch }) => `${filename}\n${patch}\n`).join('');
exports.default = concatPatchesToSingleString;
