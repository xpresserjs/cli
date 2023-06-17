import fs from "node:fs";
import { resolve } from "node:path";
import { program } from "commander";
import { red } from "chalk";
import Commands from "./src/Commands";
import packages from "./package.json";

const config = Commands.checkIfInXjsFolder(true, true);

/**
 * Get Option
 * @param opt
 */
const getOption = (opt: string) => {
    const opts = program.opts();
    return opts[opt];
};

/**
 * check if --prod is passed
 */
const isProd = () => {
    return getOption("prod");
};

/**
 * If config.version is present in config then run a version check.
 */
if (config && config.version) {
    const version = config.version;
    if (version.slice(0, 2) === ">=" && !(packages.version >= version.slice(2))) {
        console.log(
            red(
                `This Project requires xjs-cli version ${version}, upgrade xjs-cli to continue.`
            )
        );
        process.exit();
    } else if (version.slice(0, 2) === "<=" && !(packages.version <= version.slice(2))) {
        console.log(
            red(
                `This Project requires xjs-cli version ${version}, downgrade xjs-cli to continue.`
            )
        );
        process.exit();
    }
}

program.option("-p --prod", "Use production config.");

program.version(packages.version).description("XpresserJs Framework CLI");

if (!config) {
    program
        .command("new [name]")
        .alias("create")
        .description("Create new xpresser project.")
        .action((name) => Commands.create(name));

    program
        .command("init [xpresser_file]")
        .description("Creates use-xjs-cli.json for your project.")
        .action((file) => Commands.init(file));

    program
        .command("nginx:config")
        .description("Create a nginx config file for your project in this directory.")
        .action(() => Commands.nginxConf());
} else {
    program
        .command("repl [repFile]")
        .description("Start Repl")
        .action((repFile) => Commands.repl(repFile, isProd()));

    program
        .command("up")
        .description("Remove App from maintenance mood.")
        .action(() => Commands.up() as any);

    program
        .command("down")
        .description("Put App in maintenance mood.")
        .action(() => Commands.down() as any);

    program
        .command("start")
        .description("Start server.")
        .action(() => Commands.start(isProd() ? "prod" : "dev"));

    program
        .command("install [plugin]")
        .description("Install plugin.")
        .action((plugin) => Commands.installPlugin(plugin) as any);

    program
        .command("routes [search] [query]")
        .description("Show routes registered in this project")
        .action((search, query) => Commands.routes(search, query) as any);

    program
        .command("run <job...>")
        .alias("@")
        .description("Run Jobs")
        .action((name) => Commands.runJob(name) as any);

    program
        .command("stack <stack>")
        .description("Display stack commands.")
        .action((stack) => Commands.stack(stack, config) as any);

    program
        .command("@stack <stack>")
        // .alias('@stack')
        .description("Run stack")
        .action((stack) => Commands.runStack(stack, config));

    program
        .command("make:job <name> [command]")
        // .alias('mk:job')
        .description("Generate new Job.")
        .action((name, command) => Commands.makeJob(name, command) as any);

    program
        .command("make:event <name> [namespace]")
        // .alias('mk:job')
        .description("Generate new event file.")
        .action((name, namespace) => Commands.makeEvent(name, namespace) as any);

    program
        .command("make:view <name>")
        // .alias('mk:v')
        .description("Generate new view file.")
        .action((name) => Commands.makeView(name) as any);

    program
        .command("make:model <name> [table]")
        // .alias('mk:model')
        .description("Generate new Model file.")
        .action((name, table) => Commands.makeModel(name, table) as any);

    program
        .command("make:controller [name]")
        // .alias('mk:ctrl')
        .description("Generate new Controller file.")
        .action((name, args) => {
            return Commands.makeController(name, args) as any;
        })
        .option("-c, --class", "Controller Class")
        .option("-o, --object", "Controller Object")
        .option("-s, --services", "Controller with Custom Services");

    program
        .command("make:controllerService <name>")
        // .alias('mk:model')
        .description("Generate new Controller Service file.")
        .action((name) => Commands.makeControllerService(name) as any);

    program
        .command("make:middleware <name>")
        // .alias('mk:guard')
        .description("Generate new Middleware.")
        .action((name) => Commands.makeMiddleware(name) as any);

    program
        .command("cron [from_cmd]")
        .description("Start cron registered commands.")
        .option("-o, --object", "Show job object")
        .action((from_cmd, options) => {
            Commands.cron(isProd(), from_cmd, options.object);
        });

    program
        .command("stop <process>")
        .description("Stop Server or Cron")
        .action((process) => Commands.stop(process));

    program
        .command("restart <process>")
        .description("Restart Server or Cron")
        .action((process) => Commands.restart(process));

    program
        .command("import <plugin> <folder> [overwrite]")
        .alias("publish")
        .description("Extract a folder from it's plugin directory.")
        .action(
            (plugin, folder, overwrite) =>
                Commands.import(plugin, folder, overwrite) as any
        );

    program
        .command("check-for-update")
        .description("Update xpresser using your desired package manager.")
        .action(() => Commands.checkForUpdate());

    /**
     * Add Extensions from use-xjs-cli.json file.
     */
    const extensionsPath = config ? config["extensions"] : [];
    if (extensionsPath && Array.isArray(extensionsPath) && extensionsPath.length) {
        const extensionExists = (ext: string) => {
            if (!fs.existsSync(ext)) {
                throw new Error(`Cli Extension Path does not exists: "${ext}"`);
            }
        };

        for (let extensionPath of extensionsPath) {
            extensionPath = extensionPath.replace("npm://", "node_modules/");
            extensionPath = resolve(extensionPath);

            // Check if an extension exists.
            extensionExists(extensionPath);

            if (fs.statSync(extensionPath).isDirectory()) {
                extensionPath = extensionPath + "/cli-commands.json";
                // ReCheck
                extensionExists(extensionPath);
            } else {
                if (!extensionPath.includes(".json")) {
                    throw new Error(`Cli Extension paths must be a json file.`);
                }
            }

            // Load extension
            const extensions = require(extensionPath);
            for (const extension of extensions) {
                program
                    .command(extension["command"])
                    .description(extension["description"])
                    .action((...args: any[]) => {
                        let commands;

                        if (args.length >= 3) {
                            args.pop(); // remove commander args
                            args.pop(); // remove commander args

                            commands = args;
                        } else {
                            commands = [];
                        }

                        let action = extension["action"];

                        if (!action) action = extension["command"].split(" ")[0];

                        let command = (action + " " + commands.join(" ")).trim();

                        Commands.cli(command, true, false);
                    });
            }
        }
    }
}

program.showSuggestionAfterError();
program.parse(process.argv);

if (!(process.argv.length > 2)) {
    program.help();
}
