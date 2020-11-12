#!/usr/bin/env node --experimental-repl-await
const {XpresserRepl} = require('xpresser');
const repl = new XpresserRepl('{{configFile}}');

/**
 * Start The Repl Server
 * By Booting xpresser using your config.
 *
 * repl.server is now defined.
 *
 * @param $ - Current xpresser instance.
 */
repl.start(($) => {
    // Any Customization to the repl server `repl.server` directly can be done here.

    // Add Example Context to repl
    repl.addContext('example', () => 'Example content, modify in repl file.');
});

