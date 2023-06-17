import fs from "node:fs";
import { resolve } from "node:path";
import { execSync, ExecSyncOptions } from "child_process";
import ObjectCollection from "object-collection";
import { xpresserNpmId } from "./Constants";
import { cyan, magenta, red, white, yellow } from "chalk";
import { program } from "commander";

// @ts-ignore
export const xc_globalConfig = (): ObjectCollection | undefined => global["XjsCliConfig"];

/**
 * Get Option
 * @param opt
 */
export function getOption(opt: string) {
    const opts = program.opts();
    return opts[opt];
}

/**
 * check if --prod is passed
 */
export function isProd() {
    return getOption("prod");
}

/**
 * check if --show-command is passed
 */
export function showCommand() {
    return getOption("showCommand");
}

/**
 * Get a Base path
 *
 * Same as the current working directory.
 * @param path
 * @return {string|*}
 */
export function basePath(path: string = "") {
    if (path.length) {
        return process.cwd() + "/" + path;
    }
    return process.cwd();
}

/**
 * Random String Generator
 * @param length
 * @return {string}
 */
export function makeName(length: number = 10) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * Xjs Cli Path
 *
 * Used to access files where-ever xpresser-cli is installed.
 * @param $path
 * @return {string}
 */
export function cliPath($path = "") {
    return resolve(__dirname + "/../" + $path);
}

/**
 * Simple Log Function
 * Using Cyan Color
 * @param args
 */
export function log(...args: any[]) {
    args.unshift("=> ");
    console.log(cyan(...args));
}

/**
 * Simple Log Function
 * Using Cyan Color
 * @param args
 */
export function logInfo(...args: any[]) {
    args.unshift("=> ");
    console.log(magenta(...args));
}

/**
 * Error Log Function
 * Using Red Color
 * @param args
 */
export function logError(...args: any[]) {
    console.error(red(...args));
}

/**
 * LogError And Exit
 *
 * logs error then exists program.
 * @param args
 */
export function logErrorAndExit(...args: any[]) {
    if (args.length) {
        args.unshift("Error: ");
        logError(...args);
    }

    process.exit();
}

// Define Colors with bars helper function
export function yellowWithBars(str: string) {
    return yellow("{" + str.trim() + "}");
}

/**
 * Get current XjsVersion from package.json
 * @return {string}
 */
export function currentXjsVersion() {
    let packageDotJson = require(basePath("package.json"));

    let packages = packageDotJson["dependencies"];
    let packagesKeys = Object.keys(packages);
    let version = "0.0.0";

    for (let i = 0; i < packagesKeys.length; i++) {
        const packagesKey = packagesKeys[i];
        if (packagesKey === xpresserNpmId) {
            version = packages[packagesKey];
            break;
        }
    }

    if (version.slice(0, 1) === "^") {
        version = version.slice(1);
    }

    return version;
}

/**
 * Check if xpresser project uses yarn.
 * @return {boolean}
 * @constructor
 */
export function hasYarnLock() {
    return fs.existsSync(basePath("yarn.lock"));
}

/**
 * Update xpresser using yarn or npm
 * @return {*}
 */
export function updateXpresser() {
    let command = `npm install ${xpresserNpmId} --save --no-audit --silent`;

    if (!hasYarnLock()) {
        log("Using Yarn...");
        command = `yarn add ${xpresserNpmId} --silent`;
    } else {
        log("Using Npm...");
        // if NPM remove xpresser first
        execSyncSilently(`npm remove ${xpresserNpmId}`);
    }

    console.log(white("............"));
    log("Updating....");
    console.log(white("............"));

    execSyncSilently(command);

    console.log(white("............"));
    log(`${xpresserNpmId} updated successfully.`);
}

/**
 * get json content from file
 * @param file
 */
export function jsonFromFile(file: string) {
    const json = fs.readFileSync(file).toString();
    return JSON.parse(json);
}

/**
 * Custom ExecSync Function
 *
 * Note: because this method returns error and result values,
 * it runs command **silently** with stdio: "pipe" option.
 */
export function execSyncSilently(command: string, options: ExecSyncOptions = {}) {
    let error: string | undefined;
    let result: string | undefined;

    try {
        result = execSync(command, { stdio: "pipe", ...options })
            .toString()
            .trim();
    } catch (e: any) {
        if (e.stderr) error = e.stderr.toString().trim();
        if (!error && e.stdout) error = e.stdout.toString().trim();
        if (!error && e.message) error = e.message.toString().trim();
        if (!error) error = "Unknown Error";
    }

    // if the result is an empty string, set to undefined
    if (!result) result = undefined;

    return { error, result };
}

/**
 * Exec Sync Inherit
 */
export function execSyncAndInherit(command: string) {
    return execSync(command, { stdio: "inherit" });
}
