// javascript
// 关键改动：1）保存图片文件并写入 metadata.imagePath；2）在答案后输出相关图片

import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "node:path";
import mammoth from "mammoth";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { Document } from "@langchain/core/documents";

dotenv.config();

if (!process.env.GOOGLE_API_KEY) {
    throw new Error("请在 .env 文件中设置 GOOGLE_API_KEY");
}

const embeddings = new GoogleGenerativeAIEmbeddings({ model: "gemini-embedding-001" });
const chatModel = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash", temperature: 0.2 });
const visionModel = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash" });

const FAISS_INDEX_PATH = "./faiss_index";
const IMAGES_DIR = path.join(FAISS_INDEX_PATH, "images");

async function getImageDescription(base64ImageData) {
    const visionPrompt = [
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text:
                        "你是一位专业的文档分析师。请详细、客观地描述这张图片的内容。如果图片是图表或流程图，请解释它的含义和步骤。这张描述将被用于语义搜索。",
                },
                { type: "image_url", image_url: { url: `data:image/png;base64,${base64ImageData}` } },
            ],
        },
    ];
    const res = await visionModel.invoke(visionPrompt);
    return res.content.toString();
}

async function runMultimodalGoogleRag() {
    let vectorStore;
    console.log("--- 开始执行 Google 多模态 RAG 流程 (使用 FAISS) ---");

    try {
        await fs.access(FAISS_INDEX_PATH);
        console.log("\n--- 发现现有 FAISS 索引，正在从磁盘加载... ---");
        vectorStore = await FaissStore.load(FAISS_INDEX_PATH, embeddings);
        console.log("FAISS 索引加载成功！");
    } catch {
        console.log("\n--- 未发现现有索引，开始一次性创建流程... ---");

        console.log("\n--- 2. 使用 mammoth 提取 DOCX 内容 ---");
        const docxPath = "./data/help.docx";
        const { value: html } = await mammoth.convert({ path: docxPath });

        // 先保留 HTML 用于提取图片，再转文本
        const imageRegex = /<img src="data:image\/png;base64,([^"]+)" \/>/g;
        const imagesBase64 = [];
        let match;
        while ((match = imageRegex.exec(html)) !== null) imagesBase64.push(match[1]);

        const textContent = html.replace(/<[^>]+>/g, "\n").trim();
        console.log(`提取完成：找到 ${imagesBase64.length} 张图片。`);

        console.log("\n--- 3. 处理文本和图片内容 ---");
        const documents = [];
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
        const textDocs = await splitter.createDocuments([textContent]);
        documents.push(...textDocs);
        console.log(`文本被分割为 ${textDocs.length} 个块。`);

        // 确保图片目录存在
        await fs.mkdir(IMAGES_DIR, { recursive: true });

        for (let i = 0; i < imagesBase64.length; i++) {
            const base64 = imagesBase64[i];

            // 1) 保存图片到磁盘
            const fileName = `img_${String(i + 1).padStart(3, "0")}.png`;
            const filePath = path.join(IMAGES_DIR, fileName);
            await fs.writeFile(filePath, Buffer.from(base64, "base64"));
            const normalizedPath = filePath.replace(/\\/g, "/"); // 便于 Markdown 显示

            // 2) 生成图片描述并把图片路径写入 metadata
            const description = await getImageDescription(base64);
            const imageDoc = new Document({
                pageContent: `[图片描述]: ${description}`,
                metadata: { source: "image", index: i, imagePath: normalizedPath },
            });
            documents.push(imageDoc);
        }

        console.log("\n--- 4. 创建 FAISS 向量数据库 (包含文本和图片信息) ---");
        vectorStore = await FaissStore.fromDocuments(documents, embeddings);

        await vectorStore.save(FAISS_INDEX_PATH);
        console.log(`FAISS 索引创建并成功保存到 '${FAISS_INDEX_PATH}'！`);
    }

    const retriever = vectorStore.asRetriever({ k: 4 });
    console.log("向量数据库 Retriever 创建成功！");

    console.log("\n--- 5. 创建并运行 RAG 链 ---");
    const prompt = ChatPromptTemplate.fromTemplate(`
    你是一个专业、严谨的问答机器人。
    请根据下面提供的上下文信息来回答用户的问题。
    上下文中可能包含普通文本，也可能包含以 "[图片描述]:" 开头的对图片的描述。
    你的回答必须完全基于上下文，综合文本和图片信息进行回答。
    如果上下文中没有足够的信息，请明确告知“根据提供的文档，我无法回答这个问题”。

    【上下文】:
    {context}

    【问题】:
    {input}

    【回答】:
  `);

    const documentChain = await createStuffDocumentsChain({ llm: chatModel, prompt });
    const retrievalChain = await createRetrievalChain({ retriever, combineDocsChain: documentChain });

    console.log("\n--- 6. 开始提问 ---");
    const question = "授权bm5的第3个步骤是什么？";
    console.log(`用户问题: "${question}"`);

    const result = await retrievalChain.invoke({ input: question });

    // 同步获取被检索到的文档，用于输出相关图片
    const docs = await retriever.invoke(question);

    console.log("\n\n==================== 最终结果 ====================");
    console.log("【生成的答案】:");
    console.log(result.answer);

    // 新增：输出相关图片（Markdown 与文件路径）
    const imageDocs = docs.filter((d) => d.metadata?.source === "image" && d.metadata?.imagePath);
    console.log("\n【相关图片】:");
    if (imageDocs.length === 0) {
        console.log("无相关图片。");
    } else {
        imageDocs.forEach((doc, idx) => {
            console.log(`- 图片${idx + 1} 路径: ${doc.metadata.imagePath}`);
            console.log(`- Markdown: ![相关图片${idx + 1}](${doc.metadata.imagePath})`);
            console.log("");
        });
    }

    console.log("\n【参考的文档块】:");
    docs.forEach((doc, index) => {
        console.log(`--- [来源 ${index + 1}] (来源类型: ${doc.metadata?.source || "text"}) ---`);
        console.log(doc.pageContent);
        console.log("--------------------------------------------------\n");
    });
}

runMultimodalGoogleRag();