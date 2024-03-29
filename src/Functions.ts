import { cyan, yellow, red, magenta, white } from "chalk";
import fs = require("fs");
import path = require("path");
import { exec } from "shelljs";
import ObjectCollection = require("object-collection");
import { xpresserNpmId } from "./Constants";

export const xc_globalConfig = (): ObjectCollection | undefined =>
    // @ts-ignore
    global["XjsCliConfig"];

/**
 * Get Base path
 *
 * Same as current working directory.
 * @param path
 * @return {string|*}
 */
export const basePath = (path: string = "") => {
    if (path.length) {
        return process.cwd() + "/" + path;
    }
    return process.cwd();
};

/**
 * Random String Generator
 * @param length
 * @return {string}
 */
export const makeName = (length: number = 10) => {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

/**
 * Xjs Cli Path
 *
 * Used to access files where-ever xpresser-cli is installed.
 * @param $path
 * @return {string}
 */
export const cliPath = ($path = "") => {
    return path.resolve(__dirname + "/../" + $path);
};

/**
 * Simple Log Function
 * Using Cyan Color
 * @param args
 */
export const log = (...args: any[]) => {
    args.unshift("=> ");
    console.log(cyan(...args));
};

/**
 * Simple Log Function
 * Using Cyan Color
 * @param args
 */
export const logInfo = (...args: any[]) => {
    args.unshift("=> ");
    console.log(magenta(...args));
};

/**
 * Error Log Function
 * Using Red Color
 * @param args
 */
export const logError = (...args: any[]) => {
    console.error(red(...args));
};

/**
 * LogError And Exit
 *
 * logs error then exists program.
 * @param args
 */
export const logErrorAndExit = (...args: any[]) => {
    if (args.length) {
        args.unshift("Error: ");
        logError(...args);
    }

    process.exit();
};

// Define Colors with bars helper function
export const yellowWithBars = (str: string) => yellow("{" + str.trim() + "}");

/**
 * Get current XjsVersion from package.json
 * @return {string}
 */
export const currentXjsVersion = () => {
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
};

/**
 * Check if xpresser project uses yarn.
 * @return {boolean}
 * @constructor
 */
export const HasYarnLock = () => fs.existsSync(basePath("yarn.lock"));

/**
 * Update project using yarn or npm
 * @return {*}
 */
export const updateXpresser = () => {
    let command = `npm install ${xpresserNpmId} --save --no-audit --silent`;

    if (HasYarnLock()) {
        log("Using Yarn...");
        command = `yarn add ${xpresserNpmId} --silent`;
    } else {
        log("Using Npm...");
        // if NPM remove xpresser first
        exec(`npm remove ${xpresserNpmId}`, { silent: true });
    }

    console.log(white("............"));
    log("Updating....");
    console.log(white("............"));

    exec(command);

    console.log(white("............"));
    log(`${xpresserNpmId} updated successfully.`);
};

/**
 * Get All files in a given path.
 * @param path
 * @returns {Array}
 */
export const getAllFiles = (path: string) => {
    let list: string[] = [];

    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);

        for (const file of files) {
            const fullPath = path + "/" + file;

            if (fs.lstatSync(fullPath).isDirectory()) {
                const folderFiles = getAllFiles(fullPath);
                for (const folderFile of folderFiles) {
                    list.push(folderFile);
                }
            } else {
                list.push(fullPath);
            }
        }
    }

    return list;
};

/**
 * Loads project jobs.
 * @param {string} path
 * @deprecated
 * @return {{}}
 * */
export const loadJobs = function (path = "") {
    /**
     * Defaults to 'backend/jobs'
     * Cli assumes we are making use of the xpresser framework structure.
     */
    if (!path || path === "") {
        path = basePath("backend/jobs");
    }

    const $commands: Record<string, any> = {};

    const files = getAllFiles(path);

    for (const file of files) {
        const jobFile = file.replace(path, "");
        const job = require(file);

        if (typeof job !== "object") {
            logErrorAndExit("Job: {" + jobFile + "} did not return object!");

            if (job.hasOwnProperty("command") || !job.hasOwnProperty("handler")) {
                logErrorAndExit("Job: {" + jobFile + "} is not structured properly!");
            }
        }

        if (typeof job.schedule === "function") {
            job.schedule = job.schedule();
        }

        if (typeof job.schedule === "string") {
            job.path = file;
            $commands[job.command] = job;
        }
    }

    return $commands;
};

export const jsonFromFile = (file: string) => {
    const json = fs.readFileSync(file).toString();
    return JSON.parse(json);
};
