"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prompt = void 0;
var Prompt;
(function (Prompt) {
    Prompt[Prompt["CHECK_PATCH"] = 0] = "CHECK_PATCH";
    Prompt[Prompt["SYSTEM_PROMPT"] = 1] = "SYSTEM_PROMPT";
})(Prompt || (Prompt = {}));
exports.Prompt = Prompt;
const promptsConfig = {
    [Prompt.CHECK_PATCH]: 'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.',
    [Prompt.SYSTEM_PROMPT]: 'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices. Additionally, split suggestions by filenames using a pattern `@@ filename @@`',
};
exports.default = promptsConfig;
