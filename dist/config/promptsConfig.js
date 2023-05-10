"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prompt = void 0;
var Prompt;
(function (Prompt) {
    Prompt[Prompt["Check_Patch"] = 0] = "Check_Patch";
})(Prompt || (Prompt = {}));
exports.Prompt = Prompt;
const promptsConfig = {
    [Prompt.Check_Patch]: 'Based on the patch provide a list of suggestions how to improve the code with examples.',
};
exports.default = promptsConfig;
