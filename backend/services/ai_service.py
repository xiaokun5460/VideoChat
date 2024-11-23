from openai import AsyncOpenAI
import os
from typing import List
from backend.models import ChatMessage
from backend.config import AI_CONFIG
import json

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
    try:
        # 创建一个示例结构
        example = {
            "meta": {
                "name": "思维导图",
                "author": "AI",
                "version": "1.0"
            },
            "format": "node_tree",
            "data": {
                "id": "root",
                "topic": "主题",
                "children": [
                    {
                        "id": "sub1",
                        "topic": "子主题1",
                        "direction": "left",
                        "children": [
                            {
                                "id": "sub1_1",
                                "topic": "细节1",
                                "direction": "left"
                            }
                        ]
                    },
                    {
                        "id": "sub2",
                        "topic": "子主题2",
                        "direction": "right",
                        "children": [
                            {
                                "id": "sub2_1",
                                "topic": "细节2",
                                "direction": "right"
                            }
                        ]
                    }
                ]
            }
        }

        print("\n=== 开始生成思维导图 ===")
        print(f"输入文本: {text[:200]}...")  # 打印前200个字符

        response = await client.chat.completions.create(
            model=AI_CONFIG["model"],
            messages=[
                {"role": "system", "content": f"""你是一个思维导图生成专家。请将内容转换为思维导图的 JSON 结构。
                
要求：
1. 必须严格按照示例格式生成 JSON
2. JSON 必须包含 meta、format、data 三个顶级字段
3. data 必须包含 id、topic、children 字段
4. 第一层子节点必须指定 direction，左右交替分布
5. 所有节点的 id 必须唯一
6. 不要生成任何额外的说明文字，直接返回 JSON
7. 确保生成的是有效的 JSON 格式

示例结构：
{json.dumps(example, ensure_ascii=False, indent=2)}

请严格按照上述格式生成，不要添加任何其他内容。"""},
                {"role": "user", "content": text}
            ],
            stream=False,
            temperature=0.7,
            max_tokens=2000
        )
        
        full_response = response.choices[0].message.content.strip()
        print("\n=== AI 返回的原始内容 ===")
        print(full_response)
        
        # 清理 AI 返回的内容
        def clean_response(response_text: str) -> str:
            # 移除 markdown 代码块标记
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            elif response_text.startswith('```'):
                response_text = response_text[3:]
            
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            # 确保返回的是去除首尾空白的字符串
            return response_text.strip()
        
        # 清理响应内容
        cleaned_response = clean_response(full_response)
        print("\n=== 清理后的内容 ===")
        print(cleaned_response)
        
        # 尝试解析 JSON
        try:
            print("\n=== 开始解析 JSON ===")
            mindmap_data = json.loads(cleaned_response)
            print("JSON 解析成功")
            
            # 验证数据结构
            print("\n=== 验证数据结构 ===")
            if not all(key in mindmap_data for key in ['meta', 'format', 'data']):
                print("错误：缺少必要的顶级字段")
                raise ValueError("Missing required fields in mindmap data")
            
            if not all(key in mindmap_data['data'] for key in ['id', 'topic']):
                print("错误：data 对象缺少必要字段")
                raise ValueError("Missing required fields in mindmap data.data")
            
            print("数据结构验证通过")
            
            # 打印最终的数据结构
            print("\n=== 最终的思维导图数据 ===")
            print(json.dumps(mindmap_data, ensure_ascii=False, indent=2))
            
            return json.dumps(mindmap_data, ensure_ascii=False)
            
        except json.JSONDecodeError as e:
            print(f"\n=== JSON 解析错误 ===")
            print(f"错误信息: {str(e)}")
            print(f"问题内容: {cleaned_response}")
            # 返回错误提示结构
            error_mindmap = {
                "meta": {
                    "name": "解析错误",
                    "author": "System",
                    "version": "1.0"
                },
                "format": "node_tree",
                "data": {
                    "id": "root",
                    "topic": "无法生成思维导图",
                    "children": [
                        {
                            "id": "error",
                            "topic": "生成失败，请重试",
                            "direction": "right"
                        }
                    ]
                }
            }
            return json.dumps(error_mindmap, ensure_ascii=False)
        
    except Exception as e:
        print(f"\n=== 发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        print(f"完整响应: {full_response if 'full_response' in locals() else 'No response'}")
        raise

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