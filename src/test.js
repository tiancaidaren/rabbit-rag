import {ChatOpenAI} from "@langchain/openai";
import readline from "readline";
import { ChatAnthropic } from "@langchain/anthropic";
// Import environment variables
import * as dotenv from "dotenv";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";

dotenv.config();

// Create a readline interface to read user input
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
// });

// Create a function to call the Langchain API
async function chatCompletion(text) {


    const model = new ChatGoogleGenerativeAI({
        // apiKey: "sk-nUic3cxmsCOMYc40g6NeyQy0fnqUrHXcVl5T8aYPpkoojMKY",
        // apiKey: 'AIzaSyDzslE2JJ635JEz3_gLLAAD6YuGC2_19u0',
        model: "gemini-2.5-flash",
        configuration: {
        },
    });
    // const model = new ChatAnthropic({
    //     // apiKey: "sk-nUic3cxmsCOMYc40g6NeyQy0fnqUrHXcVl5T8aYPpkoojMKY",
    //     model: "claude-opus-4-1-20250805",
    //     configuration: {
    //     },
    // });
    // const model = new ChatOpenAI({
    //     // modelName 必须是 Poe 支持的机器人名称
    //     // 例如 "Gemini-2.5-Pro", "Claude-3-Opus", "GPT-4o" 等
    //     modelName: "Gemini-2.0-Flash",
    //     apiKey: "EidKWxx3_Klv0czkysXl3PJl2fZO6dCtUi8Hxvw4el8", // 建议使用 process.env.POE_API_KEY
    //
    //     // 这是最关键的配置部分
    //     configuration: {
    //         // 使用 Poe 的 API 地址
    //         baseURL: "https://api.poe.com/v1",
    //         // 使用您的 Poe API 密钥
    //         // apiKey: "EidKWxx3_Klv0czkysXl3PJl2fZO6dCtUi8Hxvw4el8", // 建议使用 process.env.POE_API_KEY
    //     },
    // });

    const response = await model.invoke(text);

    console.log("AI:", response.content);
}

// Create a function to ask for user input
// function getPrompt() {
//     rl.question("Enter your prompt: ", (input) => {
//         if (input.toUpperCase() === "EXIT") {
//             rl.close();
//         } else {
//             chatCompletion(input).then(() => getPrompt()); // Call getPrompt again to ask for the next input
//         }
//     });
// }
//
// getPrompt(); // Start the prompt
chatCompletion("你好，你是谁").then();
