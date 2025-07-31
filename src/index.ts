// 导入环境变量配置工具，用于加载 .env 文件中的环境变量
import { config } from 'dotenv';
// 导入 LangChain 的 OpenAI 聊天模型类，用于与 OpenAI API 进行交互
import { ChatOpenAI } from '@langchain/openai';
// 导入消息类型：HumanMessage(用户消息) 和 SystemMessage(系统消息)
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
// 导入提示模板类，用于创建可重用的提示模板
import { PromptTemplate } from '@langchain/core/prompts';
// 导入字符串输出解析器，用于将模型输出转换为字符串格式
import { StringOutputParser } from '@langchain/core/output_parsers';

// 加载 .env 文件中的环境变量（如 OPENAI_API_KEY）
config();

async function main() {
  try {
    // 初始化 OpenAI 聊天模型实例
    // modelName: 指定使用的模型版本
    // temperature: 控制输出的随机性，0-1之间，值越高越随机
    const chatModel = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
    });

    console.log('=== LangChain + OpenAI 示例程序 ===\n');

    // 示例1: 简单的聊天对话
    console.log('示例1: 简单聊天对话');
    // 创建消息数组，包含系统消息（设定AI角色）和用户消息（提问）
    const messages = [
      new SystemMessage('你是一个友好的AI助手，请用中文回答问题。'), // 系统消息：定义AI的行为和角色
      new HumanMessage('请介绍一下LangChain是什么？') // 用户消息：具体的问题
    ];

    // 调用聊天模型，传入消息数组，获取AI的回复
    const response1 = await chatModel.invoke(messages);
    console.log('AI回答:', response1.content); // 输出AI的回复内容
    console.log('\n---\n');

    // 示例2: 使用提示模板
    console.log('示例2: 使用提示模板');
    // 创建提示模板，{topic} 是占位符，可以动态替换
    const promptTemplate = PromptTemplate.fromTemplate(
      '请为以下主题写一首简短的诗：{topic}'
    );

    // 创建处理链：提示模板 -> 聊天模型 -> 字符串输出解析器
    // pipe() 方法将多个组件串联起来形成处理管道
    const chain = promptTemplate.pipe(chatModel).pipe(new StringOutputParser());

    // 执行处理链，传入变量值 { topic: '春天' }
    const response2 = await chain.invoke({ topic: '春天' });
    console.log('生成的诗:', response2); // 输出生成的诗歌
    console.log('\n---\n');

    // 示例3: 翻译任务
    console.log('示例3: 翻译任务');
    // 创建翻译提示模板，包含多个占位符：源语言、目标语言、待翻译文本
    const translatePrompt = PromptTemplate.fromTemplate(
      '请将以下文本从{from_language}翻译成{to_language}：\n{text}'
    );

    // 创建翻译处理链：翻译模板 -> 聊天模型 -> 字符串解析器
    const translateChain = translatePrompt.pipe(chatModel).pipe(new StringOutputParser());

    // 执行翻译任务，传入源语言、目标语言和待翻译文本
    const translation = await translateChain.invoke({
      from_language: '中文',
      to_language: '英文',
      text: '今天天气很好，适合出去散步。'
    });

    console.log('翻译结果:', translation); // 输出翻译结果
    console.log('\n---\n');

    // 示例4: 问答任务
    console.log('示例4: 知识问答');
    // 创建问答提示模板，包含上下文和问题占位符
    const qaPrompt = PromptTemplate.fromTemplate(
      '根据以下上下文回答问题：\n\n上下文：{context}\n\n问题：{question}\n\n答案：'
    );

    // 创建问答处理链：问答模板 -> 聊天模型 -> 字符串解析器
    const qaChain = qaPrompt.pipe(chatModel).pipe(new StringOutputParser());

    // 执行问答任务，传入上下文信息和具体问题
    const answer = await qaChain.invoke({
      context: 'TypeScript是由微软开发的编程语言，它是JavaScript的超集，添加了静态类型检查功能。TypeScript代码最终会编译成JavaScript代码运行。',
      question: 'TypeScript有什么主要特点？'
    });

    console.log('问答结果:', answer); // 输出基于上下文的答案

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