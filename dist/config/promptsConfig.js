"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prompt = void 0;
var Prompt;
(function (Prompt) {
    Prompt[Prompt["CHECK_PATCH"] = 0] = "CHECK_PATCH";
    Prompt[Prompt["PREPARE_SUGGESTIONS"] = 1] = "PREPARE_SUGGESTIONS";
})(Prompt || (Prompt = {}));
exports.Prompt = Prompt;
const promptsConfig = {
    [Prompt.CHECK_PATCH]: 'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.',
    [Prompt.PREPARE_SUGGESTIONS]: 'There is an array. Every object of this array has a `patch` and `filename` properties. You should make the next steps: 1. Based on `patch` property, provide a list of suggestions how to improve the code with examples according to coding standards and best practices. 2. All suggestions should be separated by `filename`',
};
exports.default = promptsConfig;
