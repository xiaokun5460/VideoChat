from openai import AsyncOpenAI
import os
from typing import List
from backend.models import ChatMessage
from backend.config import AI_CONFIG

# 配置OpenAI
client = AsyncOpenAI(
    base_url=AI_CONFIG["base_url"],
    api_key=AI_CONFIG["api_key"]
)

async def generate_summary(text: str):
    response = await client.chat.completions.create(
        model=AI_CONFIG["model"],
        messages=[
            {"role": "system", "content": "请对以下内容进行总结："},
            {"role": "user", "content": text}
        ],
        stream=True
    )
    
    async for chunk in response:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content

async def generate_mindmap(text: str) -> str:
    response = await client.chat.completions.create(
        model=AI_CONFIG["model"],
        messages=[
            {"role": "system", "content": """请生成以下内容的思维导图，使用Mermaid mindmap格式。
            注意：
            1. 不要包含 ```mermaid 和 ``` 标记
            2. 使用简洁的层级结构，最多3-4层
            3. 每个节点的文本保持简短，通常不超过10个字
            4. 使用圆括号(())标记重要节点
            5. 示例格式：
            mindmap
              root((核心主题))
                概念A
                  要点1
                  要点2
                概念B((重要))
                  细节1
                  细节2
            """},
            {"role": "user", "content": text}
        ],
        stream=True
    )
    
    full_response = ""
    async for chunk in response:
        if chunk.choices[0].delta.content is not None:
            full_response += chunk.choices[0].delta.content
    
    # 清理响应文本
    cleaned_response = full_response.strip()
    
    # 移除可能存在的 Markdown 代码块标记
    if cleaned_response.startswith("```mermaid"):
        cleaned_response = cleaned_response[10:]
    if cleaned_response.endswith("```"):
        cleaned_response = cleaned_response[:-3]
    
    # 确保返回的是完整的 Mermaid mindmap 格式
    cleaned_response = cleaned_response.strip()
    if not cleaned_response.startswith("mindmap"):
        cleaned_response = "mindmap\n" + cleaned_response
    
    return cleaned_response

async def chat_with_model(messages: List[ChatMessage], context: str):
    # 将上下文添加到消息列表中
    full_messages = [
        {"role": "system", "content": f"以下是上下文信息：\n{context}\n请基于上述上下文回答用户的问题。"}
    ]
    
    for message in messages:
        full_messages.append({
            "role": message.role,
            "content": message.content
        })
    
    response = await client.chat.completions.create(
        model=AI_CONFIG["model"],
        messages=full_messages,
        stream=True
    )
    
    async for chunk in response:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content

async def generate_detailed_summary(text: str):
    response = await client.chat.completions.create(
        model=AI_CONFIG["model"],
        messages=[
            {"role": "system", "content": """请对以下内容进行详细的总结分析，要求：
            1. 使用 Markdown 格式输出
            2. 包含主要内容、关键点、背景信息等
            3. 分点列出重要观点
            4. 添加适当的标题和分隔符
            5. 如有必要，可以添加引用和列表
            """},
            {"role": "user", "content": text}
        ],
        stream=True
    )
    
    async for chunk in response:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content 