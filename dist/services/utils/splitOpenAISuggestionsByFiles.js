"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const splitOpenAISuggestionsByFiles = (text) => {
    const regex = /@@(.+?)@@\n([\s\S]*?)(?=\n@@|$)/g;
    const matches = text.matchAll(regex);
    const results = [];
    for (const match of matches) {
        const filename = match[1];
        const suggestion = match[2].trim();
        results.push({ filename, suggestion });
    }
    return results;
};
exports.default = splitOpenAISuggestionsByFiles;
