/**
 * Xpresser Npm ID
 * @type {string}
 */
const xpresser = "xpresser";
// Import Console Colors
const { cyan, yellow, red, magenta, white } = require("chalk");
const fs = require("fs");
const path = require("path");
const { exec } = require("shelljs");

/**
 * Get Base path
 *
 * Same as current working directory.
 * @param path
 * @return {string|*}
 */
exports.basePath = (path = "") => {
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
exports.makeName = (length = 10) => {
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
exports.cliPath = ($path = "") => {
    return path.resolve(__dirname + "/../" + $path);
};

/**
 * Simple Log Function
 * Using Cyan Color
 * @param args
 */
exports.log = (...args) => {
    args.unshift("=> ");
    console.log(cyan(...args));
};

/**
 * Simple Log Function
 * Using Cyan Color
 * @param args
 */
exports.logInfo = (...args) => {
    args.unshift("=> ");
    console.log(magenta(...args));
};

/**
 * Error Log Function
 * Using Red Color
 * @param args
 */
exports.logError = (...args) => {
    console.error(red(...args));
};

/**
 * LogError And Exit
 *
 * logs error then exists program.
 * @param args
 */
exports.logErrorAndExit = (...args) => {
    if (args.length) {
        args.unshift("Error: ");
        exports.logError(...args);
    }

    process.exit();
};

// Define Colors with bars helper function
exports.yellowWithBars = (str) => yellow("{" + str.trim() + "}");

/**
 * Get current XjsVersion from package.json
 * @return {string}
 */
exports.currentXjsVersion = () => {
    let packageDotJson = require(exports.basePath("package.json"));
    let packages = packageDotJson["dependencies"];
    let packagesKeys = Object.keys(packages);
    let version = "0.0.0";

    for (let i = 0; i < packagesKeys.length; i++) {
        const packagesKey = packagesKeys[i];
        if (packagesKey === xpresser) {
            version = packages[packagesKey];
            break;
        }
    }

    if (version.substr(0, 1) === "^") {
        version = version.substr(1);
    }

    return version;
};

/**
 * Check if xpresser project uses yarn.
 * @return {boolean}
 * @constructor
 */
exports.HasYarnLock = () => fs.existsSync(exports.basePath("yarn.lock"));

/**
 * Update project using yarn or npm
 * @return {*}
 */
exports.updateXpresser = () => {
    let command = `npm install ${xpresser} --save --no-audit --silent`;

    if (exports.HasYarnLock()) {
        exports.log("Using Yarn...");
        command = `yarn add ${xpresser} --silent`;
    } else {
        exports.log("Using Npm...");
        // if NPM remove xpresser first
        exec(`npm remove ${xpresser}`, { silent: true });
    }

    console.log(white("............"));
    exports.log("Updating....");
    console.log(white("............"));

    exec(command);

    console.log(white("............"));
    exports.log(`${xpresser} updated successfully.`);
};

/**
 * Get All files in a given path.
 * @param path
 * @returns {Array}
 */
exports.getAllFiles = (path) => {
    let list = [];

    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);

        for (const file of files) {
            const fullPath = path + "/" + file;

            if (fs.lstatSync(fullPath).isDirectory()) {
                const folderFiles = exports.getAllFiles(fullPath);
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
exports.loadJobs = function (path = "") {
    /**
     * Defaults to 'backend/jobs'
     * Cli assumes we are making use of the xpresser framework structure.
     */
    if (!path || path === "") {
        path = exports.basePath("backend/jobs");
    }

    const $commands = {};

    const files = exports.getAllFiles(path);

    for (const file of files) {
        const jobFile = file.replace(path, "");
        const job = require(file);

        if (typeof job !== "object") {
            exports.logErrorAndExit("Job: {" + jobFile + "} did not return object!");

            if (job.hasOwnProperty("command") || !job.hasOwnProperty("handler")) {
                exports.logErrorAndExit(
                    "Job: {" + jobFile + "} is not structured properly!"
                );
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

exports.jsonFromFile = (file) => {
    const json = fs.readFileSync(file).toString();
    return JSON.parse(json);
};
