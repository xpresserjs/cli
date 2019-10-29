#!/usr/bin/env node
const program = require('commander');
const Commands = require('./src/commands');
let packages = require('./package.json');
let _ = require("object-collection")._;

let config = Commands.checkIfInXjsFolder(true, true);


program
    .version(packages.version)
    .description('Xjs Framework CLI');


if (!config) {

    program
        .command('new [name]')
        .alias('create')
        .description('Create new xjs project.')
        .action(name => Commands.create(name));

    program
        .command('init [xpresser_file]')
        .description("Creates use-xjs-cli.json for your project.")
        .action((file) => Commands.init(file));

    program
        .command('nginx:config')
        .description('Create a nginx config file for your project in this directory.')
        .action(() => Commands.nginxConf());

    program
        .command('install-prod-tools')
        .description('Install Production tools.')
        .action(() => Commands.installProdTools());

} else {
    program
        .command('start [env]')
        .description('Start server.')
        .action(env => Commands.start(env));

    program
        .command('install [plugin]')
        .description('Install plugin.')
        .action(plugin => Commands.installPlugin(plugin));

    program
        .command('migrate')
        .description('Migrate database of current project.')
        .action(() => Commands.migrate());

    program
        .command('migrate:make <name>')
        .description('Generate new Middleware.')
        .action((name) => Commands.migrateMake(name));

    program
        .command('migrate:rollback')
        .description('Rollback the last set of migrations.')
        .action(() => Commands.migrateRollback());

    program
        .command('migrate:refresh')
        .description('Rollback all migrations and run them again.')
        .action(() => Commands.migrateRefresh());

    program
        .command('run <job...>')
        .alias('@')
        .description('Run Jobs')
        .action((name) => Commands.runJob(name));

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
        .command('make:migration <name>')
        .description('Generate new Middleware.')
        .action((name) => Commands.migrateMake(name));

    program
        .command('make:middleware <name>')
        // .alias('mk:guard')
        .description('Generate new Middleware.')
        .action((name) => Commands.makeMiddleware(name));

    program
        .command('cron [env] [from_cmd]')
        .description('Start cron registered commands.')
        .action((env, from_cmd) => Commands.cron(env, from_cmd));

    program
        .command('stop <process>')
        .description('Stop Server or Cron')
        .action((process) => Commands.stop(process));

    program
        .command('restart <process>')
        .description('Restart Server or Cron')
        .action((process) => Commands.restart(process));


    program
        .command('check-for-update')
        .description('Update Xjs using your desired package manager.')
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
                            commands = args.splice(0, args.length-1);
                        } else {
                            commands = [];
                        }

                        let command = (extension['action'] + ' ' + commands.join(' ')).trim();
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
