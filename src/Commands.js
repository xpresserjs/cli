// Import Console Colors
const { cyan, yellow, whiteBright, white, green } = require("chalk");

// Functions
const {
    basePath,
    log,
    logErrorAndExit,
    cliPath,
    logError,
    yellowWithBars,
    currentXjsVersion,
    updateXpresser,
} = require("./Functions");

// Import Other Libraries
const { prompt } = require("inquirer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { exec } = require("shelljs");
const Questionnaire = require("./Questionaire");

const ObjectCollection = require("object-collection");
const _ = ObjectCollection.getLodash();

/**
 * Xpresser Npm ID
 * @type {string}
 */
const xpresser = "xpresser";

// Documentation links
const docs = {
    repl: "https://xpresserjs.com/cli/repl.html",
};

/**
 * Set DefaultConfig to provide values for undefined keys.
 */
const defaultConfig = require("../factory/use-xjs-cli.js");
const { jsonFromFile } = require("./Functions");

/**
 * List Of Commands
 */
const commands = {
    /**
     * Create a cli config file.
     * @param file
     */
    init(file = "xpresser.js") {
        let lang = "js";
        const UseFile = basePath("use-xjs-cli.json");

        if (fs.existsSync(UseFile)) {
            return logErrorAndExit("Init file already exists.");
        }

        if (!fs.existsSync(basePath(file))) {
            return logErrorAndExit(`File: {${file}} not found!`);
        }

        let jsonPath = cliPath("factory/use-xjs-cli.js.json");
        let fileToJs = file;

        if (file.substr(-3) === ".ts") {
            lang = "ts";
            jsonPath = cliPath("factory/use-xjs-cli.ts.json");
            fileToJs = file.substr(0, file.length - 3) + ".js";
        }

        let fileData = fs.readFileSync(jsonPath).toString();

        fileData = fileData.replace(new RegExp("{{main}}", "g"), file);
        fileData = fileData.replace("{{main_to_js}}", fileToJs);

        fs.writeFileSync(UseFile, fileData);

        log("init file created.");
    },

    /**
     * Create new app
     * @param name
     * @returns *
     */
    create(name) {
        const projectPath = path.resolve(`./${name}`);
        if (fs.existsSync(projectPath)) {
            logError(`Folder ${yellow(name)} already exists`);
            return logError(`@ ${projectPath}`);
        }

        return prompt([
            {
                type: "input",
                name: "name",
                message: "Name of new project?",
                when() {
                    return name === undefined;
                },
                validate(input) {
                    if (typeof input !== "string" || input.length < 3) {
                        return "Provide a project name.";
                    }
                    name = input;
                    return true;
                },
            },

            {
                type: "list",
                name: "lang",
                message: "Project Language?",
                choices: () => ["Javascript", "Typescript"],
                filter(choice) {
                    return choice.toLowerCase() === "javascript" ? "js" : "ts";
                },
            },

            {
                type: "list",
                name: "type",
                message: "Project Boilerplate?",
                choices: [
                    `Simple App (Hello World, No views)`,
                    `Using Ejs Template Engine`,
                    `Using Edge Template Engine (similar to Blade template)`,
                ],
                filter(choice) {
                    if (choice.includes("Simple")) {
                        choice = "simple";
                    } else if (choice.includes("Ejs")) {
                        choice = "ejs";
                    } else if (choice.includes("Edge")) {
                        choice = "edge";
                    }

                    return choice;
                },
            },
        ]).then(({ type, lang }) => {
            const index = lang === "js" ? 0 : 1;

            let gitUrl = [
                "https://github.com/xpresserjs/new-app-lite.git",
                "https://github.com/xpresserjs/new-app-lite-ts.git",
            ][index];

            if (type === "ejs") {
                gitUrl = [
                    "https://github.com/xpresserjs/new-app.git",
                    "https://github.com/xpresserjs/new-app-ts.git",
                ][index];
            } else if (type === "edge") {
                gitUrl = [
                    "https://github.com/xpresserjs/new-app-edge-js.git",
                    "https://github.com/xpresserjs/new-app-edge-ts.git",
                ][index];
            }

            const command = `git clone ${gitUrl} ${name}`;

            log(command);

            exec(command);

            // Clear .git folder after clone
            const dotGitFolder = `${projectPath}/.git`;
            if (fs.existsSync(dotGitFolder)) {
                try {
                    fs.unlinkSync(dotGitFolder);
                    exec(`rm -rf ${dotGitFolder}`);
                } catch {}
            }

            console.log(white(".........."));
            console.log(
                green(`Run the following commands to ${whiteBright("start")} your app.`)
            );
            console.log(white(".........."));

            log(`Run ${yellow(`cd ${name}`)}`);
            log(`Run ${yellow("yarn install")} or ${yellow(`npm install`)}`);
            log("After installing all dependencies....");
            log(`Run ${yellow("npm run dev")} to start app. `);
        });
    },

    /**
     * Checks if current project has xpresser.
     * @param trueOrFalse
     * @param $returnData
     * @returns {void|boolean|ObjectCollection}
     */
    checkIfInXjsFolder(trueOrFalse = false, $returnData = false) {
        if (typeof XjsCliConfig !== "undefined") {
            if (trueOrFalse) {
                return true;
            } else if ($returnData) {
                return XjsCliConfig;
            }
        }

        let appHasXjs = basePath("use-xjs-cli.json");

        if (fs.existsSync(appHasXjs)) {
            if ($returnData) {
                try {
                    let config = require(appHasXjs);
                    if (typeof config === "object") {
                        config = _.merge(defaultConfig, config);
                        global["XjsCliConfig"] = new ObjectCollection(config);

                        if (
                            !XjsCliConfig.has("dev.main") ||
                            !XjsCliConfig.has("prod.main")
                        ) {
                            return logErrorAndExit(
                                " No development/production settings in use-xjs-cli.json"
                            );
                        } else {
                            return config;
                        }
                    }
                } catch (e) {
                    return logErrorAndExit(e.message);
                }
            }
        } else {
            const msg = "Xpresser init file not found in this folder.";
            return trueOrFalse ? false : logErrorAndExit(msg);
        }
    },

    /**
     * Start Server
     * @param env
     */
    start(env = "dev") {
        let config = XjsCliConfig;

        if (env === "prod" || env === "production") {
            config = XjsCliConfig.get("prod");
            const command = `${config["start_server"]} ${config.main}`;
            const startServer = exec(command, { silent: true });

            if (!startServer.stderr.trim().length) {
                log(command);
                log("Server started.");
            } else {
                logErrorAndExit(startServer.stderr);
            }
        } else {
            config = XjsCliConfig.get("dev");
            let main = config["main"];
            let command = config["start_server"];

            exec(command.includes(main) ? command : `${command} ${main}`);
        }
    },

    /**
     * Run CLi Commands in shell
     * @param command
     * @param isDev
     * @param exit
     * @param fromXjsCli
     */
    cli(command, isDev = true, exit = true, fromXjsCli = true) {
        command = this.cliCommand(command, isDev, fromXjsCli);
        return exec(command, null, { stdio: "inherit" });
    },

    /**
     * Run CLi Commands in shell
     * @param command
     * @param isDev
     * @param exit
     */
    cliSpawn(command, isDev = true, exit = true) {
        command = this.cliCommand(command, isDev);
        const $commands = command.trim().split(" ");
        const [, ...$afterFirstCommand] = $commands;
        // return spawn($commands[0], $afterFirstCommand);
        const $process = spawn($commands[0], $afterFirstCommand);

        $process.stdout.on("data", (msg) => {
            console.log(msg.toString().trim());
        });
    },

    /**
     * Command generator helper.
     * @param command
     * @param isDev
     * @param fromXjsCli
     * @returns {string}
     */
    cliCommand(command, isDev = true, fromXjsCli = true) {
        const config = XjsCliConfig.get(isDev ? "dev" : "prod");
        return `${config["start_console"]} ${config.main} cli ${command} ${
            fromXjsCli ? "--from-xjs-cli" : ""
        }`.trim();
    },

    /**
     * Show routes in project
     * @param search
     * @param query
     * @returns {*}
     */
    routes(search, query) {
        if (!search) search = "";
        if (!query) query = "";

        return this.cli(`routes ${search} ${query}`);
    },

    /**
     * Remove App from maintenance mood
     * @returns {*}
     */
    up() {
        return this.cli("up");
    },

    /**
     * Put App in maintenance mood
     * @returns {*}
     */
    down() {
        return this.cli("down");
    },

    /**
     * Make new View
     * @param name
     * @returns {*|void}
     */
    makeView(name) {
        return this.cli("make:view " + name);
    },

    /**
     * Make new Controller
     * @param name
     * @param options
     * @returns {*|void}
     */
    makeController(name, options) {
        let $type = undefined;
        const $types = _.pick(options, ["class", "object", "services"]);

        if ($types["object"]) {
            $type = "object";
        } else if ($types["class"]) {
            $type = "class";
        } else if ($types["services"]) {
            $type = "services";
        }

        return prompt([
            {
                type: "input",
                name: "name",
                message: "Name of new controller?",
                when() {
                    return name === undefined;
                },
                validate(input) {
                    if (typeof input !== "string" || input.length < 1) {
                        return "Provide a controller name.";
                    }
                    name = input;
                    return true;
                },
            },
            {
                type: "list",
                name: "type",
                message: "Controller Type?",
                choices: [
                    `Controller Class`,
                    `Controller Object`,
                    `Controller with Custom Services`,
                ],
                when() {
                    return $type === undefined;
                },
                filter(choice) {
                    if (choice.includes("Class")) {
                        choice = "class";
                    } else if (choice.includes("Object")) {
                        choice = "object";
                    } else if (choice.includes("Services")) {
                        choice = "services";
                    }
                    return choice;
                },
            },
        ]).then(({ type }) => {
            if (type) $type = type;
            let command = "make:controller";

            if ($type === "object") {
                command = "make:controller_object";
            } else if ($type === "services") {
                command = "make:controller_services";
            }

            return this.cli(`${command} ${name}`);
        });
    },

    makeControllerService(name) {
        return this.cli(`make:controllerService ${name}`);
    },

    /**
     * Make new Model
     * @param args
     * @returns {*|void}
     */
    makeModel(...args) {
        return this.cli("make:model " + args.join(" "));
    },

    /**
     * Make new Middleware
     * @param name
     * @returns {*|void}
     */
    makeMiddleware(name) {
        return this.cli("make:middleware " + name);
    },

    /**
     * Make new Job
     * @returns {*|void}
     * @param name
     * @param command
     */
    makeJob(name, command) {
        return this.cli(`make:job ${name} ${command}`);
    },

    /**
     * Make new Event
     * @param name
     * @param namespace
     * @returns {*|void}
     */
    makeEvent(name, namespace) {
        if (namespace === undefined) {
            namespace = name;
        }

        const command = `make:event ${name} ${namespace}`.trim();

        return this.cli(command);
    },

    /**
     * Run cron Job
     * @param args
     * @returns {*|void}
     */
    runJob(args) {
        return this.cli("@" + args.join(" "));
    },

    /**
     * Call Stack
     * @param stack
     * @param config
     */
    stack(stack, config) {
        return this.runStack(stack, config, false);
    },

    /**
     * Run Stack
     * @param stack
     * @param useFile
     * @param build
     */
    runStack(stack, useFile, build = "build") {
        build = build === "build";

        if (!useFile.hasOwnProperty("stacks")) {
            return logErrorAndExit("Absence of {stacks} in use-xjs-cli.json");
        }

        let stacks = useFile.stacks;
        let stackKey = yellowWithBars(stack),
            stackPath = yellowWithBars(`stacks.${stack}`);

        if (!stacks || !stacks.hasOwnProperty(stack)) {
            return logErrorAndExit(`Stack ${stackPath} not found in use-xjs-cli.json`);
        }

        let stackData = stacks[stack];
        const stackIsArray = Array.isArray(stackData);

        if (!stackIsArray || (stackIsArray && !stackData.length)) {
            return logErrorAndExit(
                `Stack commands for ${stackPath} must be an array with more than one commands in use-xjs-cli.json`
            );
        }

        let commands = stackData.join(" && ").trim();

        if (build) {
            log(`Running stack ${stackKey}`);

            console.log("=>", commands);
            exec(commands);
            return log(`Stack ${stackKey} executed successfully!`);
        } else {
            console.log(commands);
        }
    },

    /**
     * Run cron Job
     * @param args
     * @returns {*|void}
     */
    spawnJob(args) {
        return this.cliSpawn("@" + args.join(" "));
    },

    /**
     * Run Cron Jobs
     * @param isProduction
     * @param from
     * @param showObject
     */
    cron(isProduction = false, from = undefined, showObject = false) {
        const config = XjsCliConfig.path(isProduction ? "prod" : "dev");
        const jobsPath = basePath(config.get("jobs_path", "backend/jobs"));
        let cronJsPath = jobsPath + "/cron.json";

        if (!fs.existsSync(cronJsPath)) {
            // Try cron.json
            cronJsPath = jobsPath + "/cron.js";

            if (!fs.existsSync(cronJsPath)) {
                return logErrorAndExit(
                    `(cron.js/cron.json) not found in jobs directory: (${jobsPath})`
                );
            }
        }

        let cronJobs = require(cronJsPath);
        // Require Node Cron
        const { CronJob } = require("cron");

        // let cronJobKeys = Object.keys(cronJobs);
        const cronCmd = basePath("cron-cmd.js");

        if (!fs.existsSync(cronCmd)) {
            fs.writeFileSync(cronCmd, fs.readFileSync(cliPath("factory/cron-cmd.txt")));
        }

        if (from === undefined && isProduction) {
            const start_cron = XjsCliConfig.get("prod.start_cron");
            let startCronCmd = exec(`${start_cron} cron-cmd.js`, {
                silent: true,
            });
            if (startCronCmd.stdout.trim().length) {
                return log("Cron Started.");
            }

            return log(startCronCmd.stderr);
        }

        const spawnCron = XjsCliConfig.get("async_cron_jobs", false);

        if (spawnCron) log("Running Asynchronously...");

        for (const cronJob of cronJobs) {
            if (!cronJob.hasOwnProperty("job")) {
                return logErrorAndExit(`One or many of your Jobs has no {job} property.`);
            }

            const item = cronJob["job"];

            if (!cronJob.hasOwnProperty("schedule")) {
                return logErrorAndExit(`Job {${item}} has no schedule property.`);
            }

            const args = cronJob["args"] || [];

            if (!Array.isArray(args)) {
                return logErrorAndExit(`Job {${item}} args must be of type Array`);
            }

            let duration = cronJob["schedule"];
            if (duration === "everyMinute") {
                duration = "* * * * *";
            } else if (duration === "everySecond") {
                duration = "* * * * * *";
            }

            const timezone = (cronJob["timezone"] =
                cronJob["timezone"] || process.env.TZ || "America/Los_Angeles");
            /**
             * Register Cron Jobs
             */
            new CronJob(
                duration,
                () => {
                    /**
                     * Try Job.handler else catch and log error.
                     */
                    try {
                        if (spawnCron) {
                            return commands.spawnJob([item, ...args]);
                        } else {
                            return commands.runJob([item, ...args]);
                        }
                    } catch (e) {
                        logError(`Job Error: {${item}}`);
                        log(e.stack);
                    }
                },
                true,
                timezone
            );

            log(`Job: ${yellowWithBars(item)} added to cron`);
        }

        log(`Running ${yellowWithBars(cronJobs.length.toString())} registered cron jobs`);
    },

    /**
     * Check for Xpresser Update in project
     */
    checkForUpdate() {
        log("Checking npm registry for version update...");
        let version = exec(`npm show ${xpresser} version`, {
            silent: true,
        }).stdout.trim();
        let currentVersion = currentXjsVersion();
        if (currentVersion < version) {
            log(
                `xpresser latest version is ${yellow(version)} but yours is ${whiteBright(
                    currentVersion
                )}`
            );
            return prompt({
                type: "confirm",
                name: "update",
                message: `Would you like to update?`,
            }).then(({ update }) => {
                if (update) {
                    updateXpresser();
                } else {
                    return log(`No changes made.`);
                }
            });
        }

        log(`You already have the latest version of ${yellow("xpresser")}`);
        log(`Version: ${whiteBright(currentVersion)}`);
    },

    /**
     * Stop a process
     * @param process
     */
    stop(process) {
        if (process === "all" || process === "cron") {
            const stop_cron = XjsCliConfig.get("prod.stop_cron");
            let stopCron = exec(`${stop_cron} cron-cmd.js`, { silent: true });
            if (stopCron.stdout.trim().length) {
                log("Cron Stopped.");
            }
        }

        if (process === "all" || process === "server") {
            const stop_server = XjsCliConfig.get("prod.stop_server");
            let stopServer = exec(`${stop_server} server.js`, { silent: true });
            if (stopServer.stdout.trim().length) {
                log("Server Stopped.");
            }
        }
    },

    /**
     * Restart Process
     * @param process
     */
    restart(process) {
        if (process === "all" || process === "cron") {
            this.stop("cron");
            this.cron("prod");
        }

        if (process === "all" || process === "server") {
            this.stop("server");
            this.start("prod");
        }
    },

    /**
     * Publish Folders into project
     * @param plugin
     * @param folder
     * @param overwrite
     * @return {*}
     */
    import(plugin, folder, overwrite) {
        return this.cli(`import ${plugin} ${folder} ${overwrite}`.trim());
    },

    /**
     * Installs a plugin to your project.
     * @param $plugin
     * @return {*|void}
     */
    installPlugin($plugin) {
        return this.cli(`install ${$plugin}`);
    },

    /**
     * Nginx conf validator.
     */
    nginxConf() {
        return prompt([
            {
                type: "input",
                name: "filename",
                message: "Name of config file:",
                validate(input) {
                    if (typeof input !== "string" || input.length < 3) {
                        return "Provide a file name.";
                    }

                    return true;
                },
            },

            {
                type: "list",
                name: "pathToFile",
                message: "Path to file:",
                choices: [`Current working directory: ${cyan(basePath())}`, `Specify?`],
                filter(choice) {
                    if (choice.includes("working")) {
                        choice = basePath();
                    }

                    return choice;
                },
            },

            {
                type: "input",
                name: "pathToFile",
                message: "Specify path to file:",
                when({ pathToFile }) {
                    return pathToFile === "Specify?";
                },
                validate(input) {
                    const folderExists = fs.existsSync(input);
                    if (!folderExists) {
                        return `Folder does not exist`;
                    } else if (folderExists && !fs.lstatSync(input).isDirectory()) {
                        return `${input} is not a directory`;
                    } else {
                        return true;
                    }
                },
            },

            {
                type: "input",
                name: "domain",
                message: `Your app domain:`,
                validate(input) {
                    if (typeof input !== "string" || !input.length) {
                        return "Provide domain.";
                    }

                    return true;
                },
            },

            {
                type: "input",
                name: "app_url",
                message: `Your app url (including port): e.g (${cyan("localhost:3000")})`,
                validate(input) {
                    if (typeof input !== "string" || !input.length) {
                        return "Provide app url.";
                    }

                    return true;
                },
            },
        ]).then((answers) => {
            const { filename, pathToFile, domain, app_url } = answers;
            const fullPath = path.resolve(pathToFile, filename);

            const pathToDefaultData = cliPath("factory/nginx/conf.txt");
            let nginxConfDefaultData = fs.readFileSync(pathToDefaultData).toString();

            nginxConfDefaultData = nginxConfDefaultData.replace(
                new RegExp("{{domain}}", "g"),
                domain
            );
            nginxConfDefaultData = nginxConfDefaultData.replace("{{app_url}}", app_url);

            try {
                fs.writeFileSync(fullPath, nginxConfDefaultData);
                log(`Conf: ${filename} has been created at ${cyan(fullPath)}`);
            } catch (e) {
                logErrorAndExit(e.message);
            }
        });
    },

    /**
     * Start Repl
     * @param replFile
     * @param isProd
     * @return {Promise<void>}
     */
    async repl(replFile, isProd) {
        // Modify use-xjs-cli.json
        const xjsConfigPath = basePath("use-xjs-cli.json");
        const xjsConfig = new ObjectCollection(jsonFromFile(xjsConfigPath) || {});

        if (!replFile) replFile = xjsConfig.path(isProd ? "prod" : "dev").get("repl");
        if (!replFile) replFile = "repl.js";

        const xpresserReplPath = basePath(replFile);
        if (fs.existsSync(xpresserReplPath)) {
            // include repl
            require(xpresserReplPath);
        } else {
            logError(`ReplFile (${replFile}) not found!`);

            if (isProd) return;

            const answer = await Questionnaire.yesOrNo(
                `Would you prefer us to automatically create this repl file for you?`
            );

            if (!answer) {
                return log(
                    `You can view Repl Manual Setup Documentation here ${docs.repl}`
                );
            }

            const hasConfigFile = await Questionnaire.yesOrNo(
                `Is your project config directly exported in a file?`
            );
            let configPath;

            if (hasConfigFile) {
                configPath = await Questionnaire.ask(
                    "Relative path to your project config file?",
                    (input) => {
                        if (!input) {
                            return "Path to your config file is required!";
                        }

                        const fullPath = path.resolve(input);
                        const fileExists = fs.existsSync(fullPath);

                        if (fileExists && fs.statSync(fullPath).isFile()) {
                            return true;
                        } else {
                            return `File not found at (${fullPath})`;
                        }
                    }
                );
            }

            try {
                if (hasConfigFile) {
                    let replWithConfig = fs
                        .readFileSync(cliPath("factory/repl_with_config.js"))
                        .toString();
                    replWithConfig = replWithConfig.replace("{{configFile}}", configPath);

                    fs.writeFileSync(basePath("repl.js"), replWithConfig);

                    require(basePath("repl.js"));
                } else {
                    fs.copyFileSync(cliPath("factory/repl.js"), basePath("repl.js"));
                }

                xjsConfig.path("dev").set("repl", "repl.js");
                xjsConfig.path("prod").set("repl", "repl.js");

                fs.writeFileSync(xjsConfigPath, xjsConfig.toJson(null, 2));
            } catch (e) {
                logError(`An error occurred while copying factory repl file.`);
                return logErrorAndExit(
                    `You can view Repl Manual Setup Documentation here ${docs.repl}`
                );
            }

            if (!hasConfigFile) {
                log(`(${replFile}) created successfully.`);
                log(
                    `${yellowWithBars(
                        "Setup your repl file"
                    )} and Re-run ${yellowWithBars("xjs repl")}`
                );
                log(`Documentation: ${docs.repl}`);
            }
        }
    },
};

module.exports = commands;
