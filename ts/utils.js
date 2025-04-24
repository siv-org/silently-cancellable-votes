"use strict";
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
exports.getSignal = exports.generateRandomIndex = exports.str2BigInt = exports.circomkitInstance = void 0;
const circomkit_1 = require("circomkit");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const configFilePath = path_1.default.resolve(__dirname, "..", "..", "..", "circomkit.json");
const config = JSON.parse(fs_1.default.readFileSync(configFilePath, "utf-8"));
exports.circomkitInstance = new circomkit_1.Circomkit(Object.assign(Object.assign({}, config), { verbose: false }));
/**
 * Convert a string to a bigint
 * @param s - the string to convert
 * @returns the bigint representation of the string
 */
const str2BigInt = (s) => BigInt(parseInt(Buffer.from(s).toString("hex"), 16));
exports.str2BigInt = str2BigInt;
/**
 * Generate a random number within a certain threshold
 * @param upper - the upper bound
 * @returns the random index
 */
const generateRandomIndex = (upper) => Math.floor(Math.random() * (upper - 1));
exports.generateRandomIndex = generateRandomIndex;
// @note thanks https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/test/utils.ts
// for the code below (modified version)
/**
 * Get a signal from the circuit
 * @param circuit - the circuit object
 * @param witness - the witness
 * @param name - the name of the signal
 * @returns the signal value
 */
const getSignal = (tester, witness, name) => __awaiter(void 0, void 0, void 0, function* () {
    const prefix = "main";
    // E.g. the full name of the signal "root" is "main.root"
    // You can look up the signal names using `circuit.getDecoratedOutput(witness))`
    const signalFullName = `${prefix}.${name}`;
    const out = yield tester.readWitness(witness, [signalFullName]);
    return BigInt(out[signalFullName]);
});
exports.getSignal = getSignal;
