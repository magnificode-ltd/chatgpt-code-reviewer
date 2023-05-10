"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prompt = void 0;
var Prompt;
(function (Prompt) {
    Prompt[Prompt["Check_Patch"] = 0] = "Check_Patch";
})(Prompt || (Prompt = {}));
exports.Prompt = Prompt;
const promptsConfig = {
    [Prompt.Check_Patch]: 'You now assume the role of a code reviewer. Based on the patch provide a list of suggestions how to improve the code with examples according to coding standards and best practices.',
};
exports.default = promptsConfig;
