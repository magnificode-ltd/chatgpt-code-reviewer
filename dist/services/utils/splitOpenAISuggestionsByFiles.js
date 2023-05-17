"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const splitOpenAISuggestionsByFiles = (text) => {
    const regex = /(\S+):([\s\S]*?)(?=\n\n\S+|$)/g;
    const matches = text.matchAll(regex);
    const result = [];
    for (const match of matches) {
        const [, filename, suggestion] = match;
        result.push({ filename, suggestion });
    }
    return result;
};
exports.default = splitOpenAISuggestionsByFiles;
