const { prompt } = require("inquirer");
const { makeName } = require("./Functions");

class Questionnaire {
    static async yesOrNo(question) {
        // Generate Random Name
        const name = makeName();

        // Ask Question
        const answer = await prompt([
            {
                name,
                type: "confirm",
                message: question,
            },
        ]);

        return answer[name];
    }

    static async ask(question, validate = undefined) {
        // Generate Random Name
        const name = makeName();

        // Ask Question
        const answer = await prompt([
            {
                type: "input",
                name,
                message: question,
                validate,
            },
        ]);

        return answer[name];
    }
}

module.exports = Questionnaire;
