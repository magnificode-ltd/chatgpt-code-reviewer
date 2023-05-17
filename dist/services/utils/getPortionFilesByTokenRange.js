"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getPortionFilesByTokenRange = (tokensRange, files) => {
    const firstPortion = [];
    const secondPortion = [];
    let tokensUsed = 0;
    for (const file of files) {
        if (tokensUsed + file.tokensUsed <= tokensRange) {
            firstPortion.push(file);
            tokensUsed += file.tokensUsed;
        }
        else {
            secondPortion.push(file);
            break;
        }
    }
    return {
        firstPortion,
        secondPortion,
    };
};
exports.default = getPortionFilesByTokenRange;
