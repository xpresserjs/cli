const {XpresserRepl} = require('xpresser');
const repl = new XpresserRepl();

repl.setConfigProvider(() => {
    // return your xpresser config
    return {
        env: process.env.NODE_ENV,
        paths: {base: __dirname}
    }
})

/**
 * Start The Repl Server
 * By Booting xpresser using your config.
 *
 * $ (i.e xpresserInstance) is passed as the only argument.
 * repl.server is now defined.
 */
repl.start(($) => {
    // Any Customization to the repl server `repl.server` directly can be done here.

    // Add Example Context to repl
    repl.addContext('example', () => 'Example content, modify in repl file.');
});

