#!/usr/bin/env node
const {program} = require('commander');
const {red} = require('chalk');
const Commands = require('./src/commands');
let packages = require('./package.json');
let _ = require("object-collection")._;

let config = Commands.checkIfInXjsFolder(true, true);
const isProd = (command) => {
    return !!(typeof command === "object" && command.parent && command.parent.prod);
};

/**
 * If config.version is present in config then run a version check.
 */
if (config && config.version) {
    const version = config.version;
    if (version.substr(0, 2) === '>=' && !(packages.version >= version.substr(2))) {
        console.log(red(`This Project requires xjs-cli version ${version}, upgrade xjs-cli to continue.`))
        process.exit();
    } else if (version.substr(0, 2) === '<=' && !(packages.version <= version.substr(2))) {
        console.log(red(`This Project requires xjs-cli version ${version}, downgrade xjs-cli to continue.`))
        process.exit();
    }
}

program.option('-p --prod', 'Use production config.');

program
    .version(packages.version)
    .description('XpresserJs Framework CLI');


if (!config) {

    program
        .command('new [name]')
        .alias('create')
        .description('Create new xpresser project.')
        .action(name => Commands.create(name));

    program
        .command('init [xpresser_file]')
        .description("Creates use-xjs-cli.json for your project.")
        .action((file) => Commands.init(file));

    program
        .command('nginx:config')
        .description('Create a nginx config file for your project in this directory.')
        .action(() => Commands.nginxConf());

    /**
     * @deprecated
     */
    // program
    //     .command('install-prod-tools')
    //     .description('Install Production tools.')
    //     .action(() => Commands.installProdTools());

} else {
    program
        .command('up')
        .description('Remove App from maintenance mood.')
        .action(() => Commands.up());

    program
        .command('down')
        .description('Put App in maintenance mood.')
        .action(() => Commands.down());

    program
        .command('start')
        .description('Start server.')
        .action((command) => Commands.start(isProd(command) ? 'prod' : 'dev'));

    program
        .command('install [plugin]')
        .description('Install plugin.')
        .action(plugin => Commands.installPlugin(plugin));

    program
        .command('routes [search] [query]')
        .description('Show routes registered in this project')
        .action((search, query) => Commands.routes(search, query));

    program
        .command('run <job...>')
        .alias('@')
        .description('Run Jobs')
        .action((name) => Commands.runJob(name));

    program
        .command('stack <stack>')
        .description('Display stack commands.')
        .action((stack) => Commands.stack(stack, config));

    program
        .command('@stack <stack>')
        // .alias('@stack')
        .description('Run stack')
        .action((stack) => Commands.runStack(stack, config));

    program
        .command('make:job <name> [command]')
        // .alias('mk:job')
        .description('Generate new Job.')
        .action((name, command) => Commands.makeJob(name, command));

    program
        .command('make:event <name> [namespace]')
        // .alias('mk:job')
        .description('Generate new event file.')
        .action((name, namespace) => Commands.makeEvent(name, namespace));

    program
        .command('make:view <name>')
        // .alias('mk:v')
        .description('Generate new view file.')
        .action((name) => Commands.makeView(name));

    program
        .command('make:model <name> [table]')
        // .alias('mk:model')
        .description('Generate new Model file.')
        .action((name, table) => Commands.makeModel(name, table));

    program
        .command('make:controller [name]')
        // .alias('mk:ctrl')
        .description('Generate new Controller file.')
        .action((name, args) => {
            return Commands.makeController(name, _.pick(args, [
                'class', 'object', 'services'
            ]))
        })
        .option('-c, --class', "Controller Class")
        .option('-o, --object', "Controller Object")
        .option('-s, --services', "Controller with Custom Services");

    program
        .command('make:controllerService <name>')
        // .alias('mk:model')
        .description('Generate new Controller Service file.')
        .action((name, table) => Commands.makeControllerService(name, table));

    program
        .command('make:middleware <name>')
        // .alias('mk:guard')
        .description('Generate new Middleware.')
        .action((name) => Commands.makeMiddleware(name));

    program
        .command('cron [from_cmd]')
        .description('Start cron registered commands.')
        .action((from_cmd, command) => Commands.cron(isProd(command), from_cmd, command.object))
        .option('-o, --object', "Show job object");

    program
        .command('stop <process>')
        .description('Stop Server or Cron')
        .action((process) => Commands.stop(process));

    program
        .command('restart <process>')
        .description('Restart Server or Cron')
        .action((process) => Commands.restart(process));

    program
        .command('import <plugin> <folder> [overwrite]')
        .alias('publish')
        .description('Extract a folder from it\'s plugin directory.')
        .action((plugin, folder, overwrite) => Commands.publish(plugin, folder, overwrite))


    program
        .command('check-for-update')
        .description('Update xpresser using your desired package manager.')
        .action(() => Commands.checkForUpdate());


    const extensionsPath = config ? config['extensions'] : [];

    if (extensionsPath && Array.isArray(extensionsPath) && extensionsPath.length) {
        const path = require('path');
        const fs = require('fs');

        const extensionExists = (ext) => {
            if (!fs.existsSync(ext)) {
                throw new Error(`Cli Extension Path does not exists: "${ext}"`)
            }
        };

        for (let extensionPath of extensionsPath) {
            extensionPath = extensionPath.replace('npm://', 'node_modules/');
            extensionPath = path.resolve(extensionPath);

            // Check if extension exists.
            extensionExists(extensionPath);

            if (fs.statSync(extensionPath).isDirectory()) {
                extensionPath = extensionPath + '/cli-commands.json';
                // ReCheck
                extensionExists(extensionPath);
            } else {

                if (!extensionPath.includes('.json')) {
                    throw new Error(`Cli Extension paths must be a json file.`);
                }
            }


            const extensions = require(extensionPath);

            for (const extension of extensions) {
                program
                    .command(extension['command'])
                    .description(extension['description'])
                    .action((...args) => {
                        let commands = args;

                        if (args.length > 1) {
                            commands = args.splice(0, args.length - 1);
                        } else {
                            commands = [];
                        }

                        let action = extension['action'];

                        if (!action) action = extension['command'].split(" ")[0];

                        let command = (action + ' ' + commands.join(' ')).trim();
                        return Commands.cli(command);
                    });
            }

        }
    }
}

program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});

program.parse(process.argv);

if (!(process.argv.length > 2)) {
    program.help();
}
