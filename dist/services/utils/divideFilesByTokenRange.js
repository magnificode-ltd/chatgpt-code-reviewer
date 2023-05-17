"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const divideFilesByTokenRange = (tokensRange, files) => {
    const filesInFirstPortion = [];
    const filesInSecondPortion = [];
    let totalTokensUsed = 0;
    for (const file of files) {
        if (totalTokensUsed + file.tokensUsed <= tokensRange) {
            filesInFirstPortion.push(file);
            totalTokensUsed += file.tokensUsed;
        }
        else {
            filesInSecondPortion.push(file);
            break;
        }
    }
    return {
        filesInFirstPortion,
        filesInSecondPortion,
    };
};
exports.default = divideFilesByTokenRange;
