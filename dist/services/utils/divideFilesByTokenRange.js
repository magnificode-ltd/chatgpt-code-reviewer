"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const divideFilesByTokenRange = (tokensRange, files) => {
    const result = [];
    let currentArray = [];
    let currentTokensUsed = 0;
    for (const file of files) {
        if (currentTokensUsed + file.tokensUsed <= tokensRange) {
            currentArray.push(file);
            currentTokensUsed += file.tokensUsed;
        }
        else {
            result.push(currentArray);
            currentArray = [file];
            currentTokensUsed = file.tokensUsed;
        }
    }
    if (currentArray.length > 0) {
        result.push(currentArray);
    }
    return result;
};
exports.default = divideFilesByTokenRange;
