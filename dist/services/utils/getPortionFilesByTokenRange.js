"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getPortionFilesByTokenRange = (tokensRange, files) => {
    const firstPortion = [];
    const secondPortion = [];
    let tokensUsed = 0;
    files.forEach((file) => {
        if (tokensUsed + file.tokensUsed <= tokensRange) {
            firstPortion.push(file);
            tokensUsed += file.tokensUsed;
        }
        else {
            secondPortion.push(file);
            tokensUsed = file.tokensUsed;
        }
    });
    return {
        firstPortion,
        secondPortion,
    };
};
exports.default = getPortionFilesByTokenRange;
