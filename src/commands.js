// Import Console Colors
const {
    cyan,
    yellow,
    whiteBright,
    red,
    white,
    green
} = require('chalk');

// Import Other Libraries
const {prompt} = require('inquirer');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const mkdirp = require('mkdirp');
const shell = require('shelljs');
const ObjectCollection = require("object-collection");
const _ = ObjectCollection._;


/**
 * Xjs Npm ID
 * @type {string}
 */
const xpresser = 'xpresser';


/**
 * Set DefaultConfig to provide values for undefined keys.
 */
const defaultConfig = {

    development: {
        'main': "xpresser.js",
        'console': "node",
        'server': "node",
    },

    production: {
        'main': "xpresser.js",
        'console': "node",
        'server': "forever start",
    },

    jobsPath: 'backend/jobs'
};


/**
 * Get Base path
 *
 * Same as current working directory.
 * @param path
 * @return {string|*}
 */
const basePath = (path = '') => {
    if (path.length) {
        return process.cwd() + '/' + path;
    }
    return process.cwd()
};


/**
 * Xjs Cli Path
 *
 * Used to access files where-ever xpresser-cli is installed.
 * @param $path
 * @return {string}
 */
const cliPath = ($path = '') => {
    return path.resolve(__dirname + '/../' + $path)
};


/**
 * Simple Log Function
 * Using Cyan Color
 * @param args
 */
const log = (...args) => {
    args.unshift('=> ');
    console.log(cyan(...args))
};


/**
 * Error Log Function
 * Using Red Color
 * @param args
 */
const logError = (...args) => {
    console.error(red(...args))
};


/**
 * LogError And Exit
 *
 * logs error then exists program.
 * @param args
 */
const logErrorAndExit = (...args) => {
    args.unshift('Error: ');
    logError(...args);
    process.exit();
};

// Define Colors with bars helper function
const yellowWithBars = (str) => yellow('{' + str.trim() + '}');
const whiteWithBars = (str) => whiteBright('{' + str.trim() + '}');
const redWithBars = (str) => red('{' + str.trim() + '}');

/**
 * Get current XjsVersion from package.json
 * @return {string}
 */
const currentXjsVersion = () => {
    let packageDotJson = require(basePath('package.json'));
    let packages = packageDotJson['dependencies'];
    let packagesKeys = Object.keys(packages);
    let version = '0.0.0';

    for (let i = 0; i < packagesKeys.length; i++) {
        const packagesKey = packagesKeys[i];
        if (packagesKey === xpresser) {
            version = packages[packagesKey];
            break;
        }
    }

    if (version.substr(0, 1) === '^') {
        version = version.substr(1);
    }

    return version;
};

/**
 * Check if xpresser project uses yarn.
 * @return {boolean}
 * @constructor
 */
const HasYarnLock = () => fs.existsSync(basePath('yarn.lock'));


/**
 * Update project using yarn or npm
 * @return {*}
 */
const updateXpresser = () => {
    let command = `npm install ${xpresser} --save --no-audit --silent`

    if (HasYarnLock()) {

        log('Using Yarn...');
        command = `yarn add ${xpresser} --silent`

    } else {

        log('Using Npm...');
        // if NPM remove xpresser first
        shell.exec(`npm remove ${xpresser}`, {silent: true})

    }

    console.log(white('............'));
    log('Updating....');
    console.log(white('............'));

    shell.exec(command);

    console.log(white('............'));
    log(`${xpresser} updated successfully.`);
};


/**
 * Loads project jobs.
 * @param {string} path
 * @return {{}}
 */
const loadJobs = function (path = '') {

    /**
     * Defaults to 'backend/jobs'
     * Cli assumes we are making use of the xpresser framework structure.
     */
    if (!path || path === '') {
        path = basePath('backend/jobs');
    }

    const $commands = {};

    if (fs.existsSync(path)) {
        const jobFiles = fs.readdirSync(path);

        for (let i = 0; i < jobFiles.length; i++) {

            const jobFile = jobFiles[i];
            const jobFullPath = path + '/' + jobFile;

            if (fs.lstatSync(jobFullPath).isDirectory()) {

                return loadJobs(jobFullPath);

            } else if (fs.lstatSync(jobFullPath).isFile()) {

                const job = require(jobFullPath);
                if (typeof job !== 'object') {
                    logErrorAndExit('Job: {' + jobFile + '} did not return object!');

                    if (job.hasOwnProperty('command') || !job.hasOwnProperty('handler')) {
                        logErrorAndExit('Job: {' + jobFile + '} is not structured properly!')
                    }
                }

                if (typeof job.schedule === "function") {
                    job.schedule = job.schedule();
                }

                if (typeof job.schedule === "string") {
                    job.path = jobFullPath;
                    $commands[job.command] = job;
                }

            }
        }
    }

    return $commands;
};

const commands = {
    /**
     * Create a cli config file.
     * @param file
     */
    init(file = 'xpresser.js') {
        let lang = 'js';
        const UseFile = basePath('use-xjs-cli.json');

        if (fs.existsSync(UseFile)) {
            return logErrorAndExit('Init file already exists.');
        }

        if (!fs.existsSync(basePath(file))) {
            return logErrorAndExit(`File: {${file}} not found!`)
        }

        let jsonPath = cliPath('factory/use-xjs-cli.js.json');
        let fileToJs = file;


        if (file.substr(-3) === '.ts') {
            lang = 'ts';
            jsonPath = cliPath('factory/use-xjs-cli.ts.json');
            fileToJs = file.substr(0, file.length - 3) + '.js';
        }

        let fileData = fs.readFileSync(jsonPath).toString();

        fileData = fileData.replace('{{main}}', file);
        fileData = fileData.replace('{{main_to_js}}', fileToJs);

        fs.writeFileSync(UseFile, fileData);

        log("init file created.")
    },

    create(name) {
        return prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Name new project?',
                when() {
                    return name === undefined;
                },
                validate(input) {
                    if (typeof input !== "string" || (input.length < 3)) {
                        return "Provide a project name."
                    }


                    name = input;

                    return true;
                }
            },
            {
                type: 'list',
                name: 'type',
                message: 'Project Structure?',
                choices: [
                    `Using Ejs Template Engine`,
                    `Using Edge Template Engine (similar to Laravel Blade)`,
                ],
                filter(choice) {

                    if (choice.includes('Ejs')) {
                        choice = 'ejs'
                    } else if (choice.includes('Edge')) {
                        choice = 'edge'
                    }

                    return choice;
                }
            },
        ]).then(({type}) => {
            let gitUrl = 'https://github.com/xpresserjs/new-app.git';
            if (type === 'edge') {
                gitUrl = 'https://github.com/xpresserjs/new-app-edge-js.git';
            }

            const command = `git clone ${gitUrl} ${name}`;
            log(command);
            shell.exec(command);

            console.log(white('..........'));
            console.log(green(`Run the following commands to ${whiteBright('start')} your app.`));
            console.log(white('..........'));


            log(`Run ${yellow(`cd ${name}`)}`);
            log(`Run ${yellow('yarn')} or ${yellow(`npm install`)}`);
            log('After installing all dependencies....');
            log(`Run ${yellow('node app.js')} to start app. `);
        });
    },

    installProdTools() {
        log(`Checking if ${yellow('knex')} exists...`);
        let hasKnex = shell.exec('npm ls -g knex', {silent: true}).stdout;
        if (!hasKnex.includes('knex@')) {
            log(`Installing ${yellow('knex')} globally.`);
            shell.exec('npm install knex -g', {silent: true})
        }

        log(`Checking if ${yellow('forever')} exists...`);
        let hasForever = shell.exec('npm ls -g forever', {silent: true}).stdout;
        if (!hasForever.includes('forever@')) {
            log(`Installing ${yellow('forever')} globally.`);
            shell.exec('npm install forever -g', {silent: true})
        }

        log('All production tools are installed!');
    },

    checkIfInXjsFolder(trueOrFalse = false, $returnData = false) {

        if (typeof XjsCliConfig !== "undefined") {
            if (trueOrFalse) {
                return true;
            } else if ($returnData) {
                return XjsCliConfig;
            }
        }

        let appHasXjs = basePath('use-xjs-cli.json');
        if (fs.existsSync(appHasXjs)) {
            if ($returnData) {
                try {
                    let config = require(appHasXjs);
                    if (typeof config === "object") {
                        config = _.merge(defaultConfig, config);
                        global['XjsCliConfig'] = new ObjectCollection(config);

                        if (
                            !XjsCliConfig.has('development.main')
                            ||
                            !XjsCliConfig.has('production.main')
                        ) {
                            return logErrorAndExit(" No development/production settings in use-xjs-cli.json");
                        } else {
                            return config;
                        }
                    }
                } catch (e) {
                    return logErrorAndExit(e.message);
                }
            }
        } else {
            const msg = 'Xjs project not found in this folder.';
            return trueOrFalse ? false : logErrorAndExit(msg);
        }

    },

    migrate() {
        return this.cli("migrate");
    },

    migrateMake(...args) {
        this.cli(`migrate make ${args.join(' ')}`);
    },

    migrateRefresh(skip = false) {
        if (!skip) {
            this.checkIfInXjsFolder();
            log('Rolling back migrations...');
        }

        const rollback = shell.exec(
            this.cliCommand(`migrate rollback`),
            {silent: true}
        );

        if (!rollback.stdout.toLowerCase().includes('already')) {
            return this.migrateRefresh(true);
        } else {
            this.cli('migrate latest', false);
            return log('Migrations refreshed successfully!');
        }
    },

    migrateRollback() {
        return this.cli('migrate rollback');
    },

    start(env = 'development') {
        let config = XjsCliConfig;

        if (env === 'prod' || env === 'production') {
            config = XjsCliConfig.get('production');
            const command = `${config.server} ${config.main}`;
            const startServer = shell.exec(command, {silent: config.server.includes('forever')});

            if (!startServer.stderr.trim().length) {
                log(command);
                log('Server started.');
            } else {
                logErrorAndExit(startServer.stderr);
            }
        } else {
            config = XjsCliConfig.get('development');
            shell.exec(`${config.server} ${config.main}`);
        }
    },

    cli(command, exit = true) {
        shell.exec(this.cliCommand(command));
        if (exit) process.exit();
    },

    cliCommand(command){
        const config = XjsCliConfig.get('development');
        return `${config.console} ${config.main} cli ${command}`;
    },

    makeView(name) {
        return this.cli("make:view " + name)
    },

    makeController(name) {
        return this.cli('make:controller ' + name)
    },

    makeModel(...args) {
        return this.cli('make:model ' + args.join(' '))
    },

    makeMiddleware(name) {
        return this.cli('make:middleware ' + name)
    },

    makeJob(...args) {
        return this.cli('make:job ' + args.join(' '))
    },

    runJob(args) {
        return this.cli('@' + args.join(' '))
    },

    cron(env = 'development', from = undefined) {
        if (env === 'prod') env = 'production';

        const config = XjsCliConfig.get(env);
        // Require Project Xjs
        require(basePath(config['main']));

        const cron = require('node-cron');

        let cronJobs = loadJobs(basePath(XjsCliConfig.get("jobsPath")));

        let cronJobKeys = Object.keys(cronJobs);
        const cronCmd = basePath('cron-cmd.js');

        if (!fs.existsSync(cronCmd)) {
            fs.writeFileSync(cronCmd, fs.readFileSync(cliPath('factory/cron-cmd.txt')));
        }

        env = env === 'production' ? 'prod' : env;

        if (from === undefined && env === 'prod') {
            let startCronCmd = shell.exec(`forever start ./cron-cmd.js`, {silent: true});
            if (startCronCmd.stdout.trim().length) {
                return log('Cron Started.');
            }
        }

        for (let i = 0; i < cronJobKeys.length; i++) {
            const cronJobKey = cronJobKeys[i];
            const cronJob = cronJobs[cronJobKey];
            let duration = cronJob['schedule'];

            if (duration === 'everyMinute') {
                duration = "* * * * *";
            }

            cron.schedule(duration, () => {
                shell.exec('xpresser @ ' + cronJob.command);
            }, {});

            log(`Job: ${yellowWithBars(cronJob.command)} added to cron`)
        }
    },

    checkForUpdate() {
        log('Checking npm registry for version update...');
        let version = shell.exec(`npm show ${xpresser} version`, {silent: true}).stdout.trim();
        let currentVersion = currentXjsVersion();
        if (currentVersion < version) {
            log(`Xjs latest version is ${yellow(version)} but yours is ${whiteBright(currentVersion)}`);
            return prompt({
                'type': 'confirm',
                name: 'update',
                message: `Would you like to update?`
            }).then(({update}) => {
                if (update) {
                    updateXpresser();
                } else {
                    return log(`No changes made.`);
                }
            });
        }

        log(`You already have the latest version of ${yellow('Xjs')}`);
        log(`Version: ${whiteBright(currentVersion)}`)
    },

    stop(process) {
        const PM_PATH = basePath(`node_modules/${xpresser}/src/Console/ProcessManager.js`);

        if (!fs.existsSync(PM_PATH)) {
            return logErrorAndExit('Xjs Cannot find ProcessManager in this project');
        }
        let ProcessManager = {};

        try {
            ProcessManager = new (require(PM_PATH))(basePath());
        } catch (e) {
            return logErrorAndExit(e.message);
        }


        if (process === 'all' || process === 'cron') {
            let stopCron = shell.exec('forever stop ./cron-cmd.js', {silent: true});
            if (stopCron.stdout.trim().length) {
                // End all process associated with file
                ProcessManager.endProcess(basePath('cron-cmd.js'), 'all');
                log('Cron Stopped.');
            }
        }
        if (process === 'all' || process === 'server') {
            let stopServer = shell.exec('forever stop ./server.js', {silent: true});
            if (stopServer.stdout.trim().length) {
                // End all process associated with file
                ProcessManager.endProcess(basePath('server.js'), 'all');
                log('Server Stopped.');
            }
        }
    },

    restart(process) {
        if (process === 'all' || process === 'cron') {
            this.stop('cron');
            this.cron('prod')
        }
        if (process === 'all' || process === 'server') {
            this.stop('server');
            this.start('prod');
        }
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
        const ASSUMED_NGINX_PATH = '/etc/nginx/sites-available';

        return prompt([
            {
                type: 'input',
                name: 'filename',
                message: 'Name of config file:',
                validate(input) {
                    if (typeof input !== "string" || (input.length < 3)) {
                        return "Provide a file name."
                    }

                    return true;
                }
            },

            {
                type: 'list',
                name: 'pathToFile',
                message: 'Path to file:',
                choices: [
                    `Current working directory: ${cyan(basePath())}`,
                    `Specify?`,
                ],
                filter(choice) {

                    if (choice.includes('working')) {
                        choice = basePath()
                    }

                    return choice;
                }
            },

            {
                type: 'input',
                name: 'pathToFile',
                message: 'Specify path to file:',
                when({pathToFile}) {
                    return pathToFile === 'Specify?';
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
                }
            },

            {
                type: 'input',
                name: 'domain',
                message: `Your app domain:`,
                validate(input) {
                    if (typeof input !== "string" || !input.length) {
                        return "Provide domain."
                    }

                    return true;
                }
            },

            {
                type: 'input',
                name: 'app_url',
                message: `Your app url (including port): e.g (${cyan('localhost:3000')})`,
                validate(input) {
                    if (typeof input !== "string" || !input.length) {
                        return "Provide app url."
                    }

                    return true;
                }
            }
        ]).then((answers) => {
            const {filename, pathToFile, domain, app_url} = answers;
            const fullPath = path.resolve(pathToFile, filename);

            const pathToDefaultData = cliPath('factory/nginx/conf.txt');
            let nginxConfDefaultData = fs.readFileSync(pathToDefaultData).toString();

            nginxConfDefaultData = nginxConfDefaultData.replace('{{domain}}', domain);
            nginxConfDefaultData = nginxConfDefaultData.replace('{{app_url}}', app_url);

            try {
                fs.writeFileSync(fullPath, nginxConfDefaultData);
                log(`Conf: ${filename} has been created at ${cyan(fullPath)}`)
            } catch (e) {
                logErrorAndExit(e.message);
            }
        });
    }
};


module.exports = commands;
