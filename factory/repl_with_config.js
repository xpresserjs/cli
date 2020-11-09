#!/usr/bin/env node --experimental-repl-await
const {XpresserRepl} = require('xpresser');
const repl = new XpresserRepl('{{configFile}}');

/**
 * Add custom context to repl
 */
// repl.addContext('customContent', 'customContent Value!');


/**
 * Start The Repl Server
 * By Booting xpresser using your config.
 */
repl.start(($) => {
    // $ (i.e xpresserInstance) is passed as the only argument.
    // repl.server is now defined.
    // Any Customization to the repl server directly can be done here.
});

