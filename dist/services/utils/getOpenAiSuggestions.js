"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const node_fetch_1 = __importDefault(require("node-fetch"));
const errorsConfig_1 = __importStar(require("../../config/errorsConfig"));
const promptsConfig_1 = __importStar(require("../../config/promptsConfig"));
const OPENAI_MODEL = (0, core_1.getInput)('model');
const { OPENAI_API_KEY } = process.env;
const getOpenAiSuggestions = (patch) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!patch) {
        throw new Error(errorsConfig_1.default[errorsConfig_1.ErrorMessage.MISSING_PATCH_FOR_OPENAI_SUGGESTION]);
    }
    try {
        const response = yield (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer  ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    { role: 'system', content: promptsConfig_1.default[promptsConfig_1.Prompt.SYSTEM_PROMPT] },
                    { role: 'user', content: patch },
                ],
            }),
        });
        if (!response.ok)
            throw new Error('Failed to post data.');
        const responseJson = (yield response.json());
        const openAiSuggestion = ((_b = (_a = responseJson.choices.shift()) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
        return openAiSuggestion;
    }
    catch (error) {
        console.error('Error posting data:', error);
        throw error;
    }
});
exports.default = getOpenAiSuggestions;
