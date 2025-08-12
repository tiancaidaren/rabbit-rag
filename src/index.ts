// 导入环境变量配置工具，用于加载 .env 文件中的环境变量
import { config } from 'dotenv';
// 导入 LangChain 的 OpenAI 聊天模型类，用于与 OpenAI API 进行交互
import { ChatOpenAI } from '@langchain/openai';
// 导入消息类型：HumanMessage(用户消息) 和 SystemMessage(系统消息)

// 加载 .env 文件中的环境变量（如 OPENAI_API_KEY）
config();

async function main() {
  try {
    // 初始化 OpenAI 聊天模型实例
    // modelName: 指定使用的模型版本
    // temperature: 控制输出的随机性，0-1之间，值越高越随机
    const chatModel = new ChatOpenAI({
      // modelName 必须是 Poe 支持的机器人名称
      // 例如 "Gemini-2.5-Pro", "Claude-3-Opus", "GPT-4o" 等
      modelName: "Gemini-2.0-Flash",

      openAIApiKey: "EidKWxx3_Klv0czkysXl3PJl2fZO6dCtUi8Hxvw4el8",
      // 这是最关键的配置部分
      configuration: {
        // 使用 Poe 的 API 地址
        baseURL: "https://api.poe.com/v1",
        // 使用您的 Poe API 密钥
        // apiKey: "EidKWxx3_Klv0czkysXl3PJl2fZO6dCtUi8Hxvw4el8", // 建议使用 process.env.POE_API_KEY
      },
    });

    console.log('=== LangChain + OpenAI 示例程序 ===\n');


  } catch (error: unknown) { // 捕获可能出现的错误，使用 unknown 类型避免 TypeScript 类型错误
    console.error('运行错误:', error); // 输出错误信息

    // 检查错误是否与 API 密钥相关（类型安全检查）
    if (error instanceof Error && error.message?.includes('API key')) {
      console.log('\n请确保在 .env 文件中设置了正确的 OPENAI_API_KEY');
    }
  }
}

// 运行主函数，如果出现未处理的错误则输出到控制台
main().catch(console.error);