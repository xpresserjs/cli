import { prompt } from "inquirer";
import { makeName } from "./Functions";

class Questionnaire {
    static async yesOrNo(question: string) {
        // Generate Random Name
        const name = makeName();

        // Ask Question
        const answer = await prompt([
            {
                name,
                type: "confirm",
                message: question
            }
        ]);

        return answer[name];
    }

    static async ask(question: string, validate: (input?: string) => any) {
        // Generate Random Name
        const name = makeName();

        // Ask Question
        const answer = await prompt([
            {
                type: "input",
                name,
                message: question,
                validate
            }
        ]);

        return answer[name];
    }
}

export = Questionnaire;
