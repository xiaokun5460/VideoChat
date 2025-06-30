from openai import AsyncOpenAI
import os
import uuid
import asyncio
import concurrent.futures
from datetime import datetime
from typing import List
from models import ChatMessage
from config import AI_CONFIG
from html2image import Html2Image
import json
import logging

# 配置OpenAI
client = AsyncOpenAI(
    base_url=AI_CONFIG["base_url"],
    api_key=AI_CONFIG["api_key"]
)

async def generate_summary(text: str, stream: bool = True):
    response = await client.chat.completions.create(
        model=AI_CONFIG["model"],
        messages=[
            {"role": "system", "content": "请对以下内容进行总结："},
            {"role": "user", "content": text}
        ],
        stream=stream
    )

    if stream:
        async for chunk in response:
            # 安全检查：确保choices数组不为空且包含delta内容
            if (chunk.choices and
                len(chunk.choices) > 0 and
                hasattr(chunk.choices[0], 'delta') and
                chunk.choices[0].delta.content is not None):
                yield chunk.choices[0].delta.content
    else:
        # 非流式响应，直接返回完整内容
        if response.choices and len(response.choices) > 0:
            yield response.choices[0].message.content

async def generate_mindmap(text: str, stream: bool = False) -> str:
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
            stream=stream,
            temperature=0.7,
            max_tokens=2000
        )
        
        if stream:
            # 流式响应需要收集所有块
            full_response = ""
            async for chunk in response:
                if (chunk.choices and
                    len(chunk.choices) > 0 and
                    hasattr(chunk.choices[0], 'delta') and
                    chunk.choices[0].delta.content is not None):
                    full_response += chunk.choices[0].delta.content
            full_response = full_response.strip()
        else:
            # 非流式响应
            full_response = response.choices[0].message.content.strip()
        
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
        
        # 尝试解析 JSON
        try:
            mindmap_data = json.loads(cleaned_response)
            
            # 验证数据结构
            if not all(key in mindmap_data for key in ['meta', 'format', 'data']):
                raise ValueError("Missing required fields in mindmap data")
            
            if not all(key in mindmap_data['data'] for key in ['id', 'topic']):
                raise ValueError("Missing required fields in mindmap data.data")
            
            return json.dumps(mindmap_data, ensure_ascii=False)
            
        except json.JSONDecodeError as e:
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
            logging.error(f"错误类型: {type(e).__name__}")
            logging.error(f"错误信息: {str(e)}")
            # 返回错误提示结构
            error_mindmap = {
                "meta": {
                    "name": "生成错误",
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
        logging.error(f"生成思维导图时发生未预期错误: {type(e).__name__}: {str(e)}")
        # 返回错误提示结构
        error_mindmap = {
            "meta": {
                "name": "系统错误",
                "author": "System",
                "version": "1.0"
            },
            "format": "node_tree",
            "data": {
                "id": "root",
                "topic": "系统错误",
                "children": [
                    {
                        "id": "error",
                        "topic": "请稍后重试",
                        "direction": "right"
                    }
                ]
            }
        }
        return json.dumps(error_mindmap, ensure_ascii=False)

async def chat_with_model(messages: List[ChatMessage], context: str = "", stream: bool = True):
    # 构建消息列表
    full_messages = []

    # 只有当context不为空时才添加系统消息
    if context and context.strip():
        full_messages.append({
            "role": "system",
            "content": f"以下是上下文信息：\n{context}\n请基于上述上下文回答用户的问题。"
        })

    # 添加对话历史
    for message in messages:
        full_messages.append({
            "role": message.role,
            "content": message.content
        })

    response = await client.chat.completions.create(
        model=AI_CONFIG["model"],
        messages=full_messages,
        stream=stream
    )

    if stream:
        async for chunk in response:
            # 安全检查：确保choices数组不为空且包含delta内容
            if (chunk.choices and
                len(chunk.choices) > 0 and
                hasattr(chunk.choices[0], 'delta') and
                chunk.choices[0].delta.content is not None):
                yield chunk.choices[0].delta.content
    else:
        # 非流式响应，直接返回完整内容
        if response.choices and len(response.choices) > 0:
            yield response.choices[0].message.content

async def generate_detailed_summary(text: str, stream: bool = True):
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
        stream=stream
    )

    if stream:
        async for chunk in response:
            # 安全检查：确保choices数组不为空且包含delta内容
            if (chunk.choices and
                len(chunk.choices) > 0 and
                hasattr(chunk.choices[0], 'delta') and
                chunk.choices[0].delta.content is not None):
                yield chunk.choices[0].delta.content
    else:
        # 非流式响应，直接返回完整内容
        if response.choices and len(response.choices) > 0:
            yield response.choices[0].message.content

async def generate_mindmap_image(text: str) -> dict:
    """
    生成HTML格式的思维导图并转换为图片

    Args:
        text (str): 要生成思维导图的文本内容

    Returns:
        dict: 包含图片路径和访问URL的字典

    Raises:
        Exception: 当生成或转换过程中发生错误时
    """
    try:
        # 确保mindmaps目录存在（使用绝对路径）
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        mindmaps_dir = os.path.join(base_dir, "uploads", "mindmaps")
        os.makedirs(mindmaps_dir, exist_ok=True)

        # 生成唯一的文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"mindmap_{timestamp}_{unique_id}.png"
        image_path = os.path.join(mindmaps_dir, filename)

        # 使用AI生成HTML格式的思维导图
        html_content = await _generate_mindmap_html(text)
        logging.info(f"HTML: {html_content}")

        # 使用playwright将HTML转换为图片
        await _html_to_image(html_content, image_path)

        # 构建访问URL（假设服务运行在localhost:8000）
        image_url = f"/uploads/mindmaps/{filename}"

        return {
            "image_path": image_path,
            "image_url": image_url
        }

    except Exception as e:
        logging.error(f"生成思维导图图片时发生错误: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"思维导图图片生成失败: {str(e)}")

async def _generate_mindmap_html(text: str) -> str:
    """
    使用AI生成HTML格式的思维导图

    Args:
        text (str): 输入文本

    Returns:
        str: 完整的HTML内容
    """
    html_template = """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>思维导图</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Microsoft YaHei', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: transparent;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 0;
                margin: 0;
            }
            .mindmap-container {
                background: transparent;
                width: 100%;
                max-width: 1400px;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 0;
            }
            .mindmap-content {
                width: 100%;
                height: 100%;
                background: transparent;
            }
        </style>
    </head>
    <body>
        <div class="mindmap-container">
            <div class="mindmap-content">
                <!-- MINDMAP_CONTENT_PLACEHOLDER -->
            </div>
        </div>
    </body>
    </html>
    """

    try:
        response = await client.chat.completions.create(
            model=AI_CONFIG["model"],
            messages=[
                {"role": "system", "content": f"""你是一个专业的思维导图设计专家。请将输入的文本内容转换为专业、美观的HTML思维导图。

## 🎯 核心设计要求

### 1. **内容分析与结构化**
- 深度分析文本内容，提取核心主题和关键要点
- 构建清晰的层次结构：中心主题 → 主要分支 → 次级分支 → 细节要点
- 确保逻辑关系清晰，内容组织合理

### 2. **视觉设计规范**
- **透明背景**：所有背景必须是 `transparent`，确保图片背景透明
- **现代化配色**：使用渐变色彩，主分支采用不同色系区分
- **层次化字体**：中心主题(24px) → 主分支(18px) → 次级分支(14px) → 细节(12px)
- **圆角设计**：所有节点使用圆角，中心主题圆形，分支圆角矩形

### 3. **布局与连接线**
- **放射状布局**：中心主题居中，主分支向四周扩散
- **智能连接线**：使用CSS绘制优雅的连接线，颜色与分支呼应
- **合理间距**：确保节点间距适中，避免重叠和过于稀疏
- **响应式设计**：使用flexbox确保在不同尺寸下都美观

### 4. **色彩系统**
- 中心主题：深蓝渐变 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- 主分支色彩：
  * 分支1：绿色系 `linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)`
  * 分支2：橙色系 `linear-gradient(135deg, #fa709a 0%, #fee140 100%)`
  * 分支3：紫色系 `linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)`
  * 分支4：蓝色系 `linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)`
- 次级分支：对应主分支的浅色版本
- 连接线：与分支同色系，透明度0.6

### 5. **CSS样式要求**
必须包含以下样式元素：
- mindmap-root: 主容器，使用flex布局，透明背景
- central-topic: 中心主题，圆形设计，渐变背景
- branches-container: 分支容器，使用grid布局
- branch: 单个分支，flex列布局
- branch-main: 主分支节点，圆角矩形，渐变背景
- sub-branches: 子分支容器
- sub-branch: 子分支节点，简洁设计
- 连接线: 使用CSS伪元素绘制

### 6. **配色方案**
- 中心主题: 深蓝渐变 linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- 分支1: 蓝色系 linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)
- 分支2: 粉橙系 linear-gradient(135deg, #fa709a 0%, #fee140 100%)
- 分支3: 青粉系 linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)
- 分支4: 橙色系 linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)

### 7. **HTML结构要求**
使用以下结构：
<div class="mindmap-root">
    <div class="central-topic">核心主题</div>
    <div class="branches-container">
        <div class="branch branch-1">
            <div class="branch-main">主分支1</div>
            <div class="sub-branches">
                <div class="sub-branch">子要点1</div>
                <div class="sub-branch">子要点2</div>
            </div>
        </div>
    </div>
</div>

## 输出要求
1. 只返回要插入到mindmap-content div中的HTML内容（包含style标签）
2. 不要包含完整的HTML文档结构
3. 确保所有背景都是透明的
4. 根据实际内容调整分支数量和层级
5. 保持专业美观的视觉效果
6. 使用上述配色方案和结构要求"""},
                {"role": "user", "content": text}
            ],
            stream=False,
            temperature=0.8,
            max_tokens=4000
        )

        mindmap_html = response.choices[0].message.content.strip()

        # 清理AI返回的内容，移除可能的markdown标记
        if mindmap_html.startswith('```html'):
            mindmap_html = mindmap_html[7:]
        elif mindmap_html.startswith('```'):
            mindmap_html = mindmap_html[3:]

        if mindmap_html.endswith('```'):
            mindmap_html = mindmap_html[:-3]

        mindmap_html = mindmap_html.strip()

        # 将生成的内容插入到HTML模板中
        complete_html = html_template.replace("<!-- MINDMAP_CONTENT_PLACEHOLDER -->", mindmap_html)

        return complete_html

    except Exception as e:
        logging.error(f"生成HTML思维导图时发生错误: {str(e)}")
        # 返回一个简单的错误提示HTML
        error_html = html_template.replace(
            "<!-- MINDMAP_CONTENT_PLACEHOLDER -->",
            '<div style="text-align: center; color: #ff6b6b; font-size: 18px;">思维导图生成失败，请重试</div>'
        )
        return error_html

def _html_to_image_sync(html_content: str, output_path: str):
    """
    使用html2image同步方式将HTML内容转换为图片

    Args:
        html_content (str): HTML内容
        output_path (str): 输出图片路径
    """
    try:
        logging.info(f"� 开始HTML转图片，输出路径: {output_path}")

        # 创建Html2Image实例
        hti = Html2Image()

        # 设置输出目录和文件名
        output_dir = os.path.dirname(output_path)
        filename = os.path.basename(output_path)

        # 如果输出目录为空（相对路径），使用当前目录
        if not output_dir:
            output_dir = os.getcwd()
            output_path = os.path.join(output_dir, filename)

        logging.info(f"📁 输出目录: {output_dir}")
        logging.info(f"� 文件名: {filename}")

        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        hti.output_path = output_dir

        # 设置浏览器参数以优化性能和兼容性
        logging.info("🔧 配置浏览器参数...")
        hti.browser.flags = [
            '--no-sandbox',                    # 禁用沙盒模式，提高兼容性
            '--disable-dev-shm-usage',         # 禁用/dev/shm使用，避免内存问题
            '--disable-gpu',                   # 禁用GPU加速，提高稳定性
            '--hide-scrollbars',               # 隐藏滚动条
            '--disable-background-timer-throttling',  # 禁用后台定时器限制
            '--disable-backgrounding-occluded-windows',  # 禁用后台窗口优化
            '--disable-renderer-backgrounding',  # 禁用渲染器后台化
            '--disable-features=TranslateUI',   # 禁用翻译UI
            '--disable-ipc-flooding-protection',  # 禁用IPC洪水保护
            '--virtual-time-budget=10000',     # 增加虚拟时间预算，确保完整渲染
            '--run-all-compositor-stages-before-draw',  # 确保所有合成阶段完成
            '--disable-background-networking'   # 禁用后台网络请求
        ]

        # 使用紧凑布局模式，减少白边
        logging.info("📐 设置紧凑布局模式...")

        # 根据内容长度估算合适的高度（保守估算）
        content_length = len(html_content)
        base_height = 300  # 更小的基础高度
        content_height = content_length // 10  # 更保守的比例
        estimated_height = max(600, min(2000, base_height + content_height))

        image_size = (1200, estimated_height)
        logging.info(f"📏 内容长度: {content_length}, 估算高度: {estimated_height}px")

        logging.info("🌐 开始转换HTML为图片...")
        # 转换HTML为图片
        hti.screenshot(
            html_str=html_content,
            save_as=filename,
            size=image_size
        )

        # 验证文件是否成功生成
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            logging.info(f"✅ HTML转图片完成，文件大小: {file_size} 字节")
        else:
            raise Exception("图片文件未成功生成")

    except Exception as e:
        logging.info(f"❌ HTML转图片时发生错误: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"图片转换失败: {str(e)}")

async def _html_to_image(html_content: str, output_path: str):
    """
    使用Playwright精确截图，完全消除白边问题

    Args:
        html_content (str): HTML内容
        output_path (str): 输出图片路径

    Raises:
        Exception: 当图片转换失败时
    """
    try:
        logging.info("🎨 开始Playwright精确截图...")

        # 尝试使用Playwright进行精确截图
        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                # 启动浏览器
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--hide-scrollbars'
                    ]
                )

                # 创建页面
                page = await browser.new_page(
                    viewport={'width': 1200, 'height': 800}
                )

                # 设置HTML内容
                await page.set_content(html_content, wait_until='networkidle')

                # 等待内容完全渲染
                await page.wait_for_timeout(1000)

                # 查找容器元素并截图
                container = await page.query_selector('.container')
                if container:
                    # 截取容器元素，完全消除白边
                    await container.screenshot(
                        path=output_path,
                        type='png'
                    )
                    logging.info("✅ 使用Playwright元素截图，完全消除白边")
                else:
                    # 如果找不到容器，使用全页面截图
                    await page.screenshot(
                        path=output_path,
                        type='png',
                        full_page=True
                    )
                    logging.info("⚠️ 容器未找到，使用全页面截图")

                await browser.close()

            # 验证文件是否成功生成
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                logging.info(f"✅ Playwright截图完成，文件大小: {file_size} 字节")
            else:
                raise Exception("图片文件未成功生成")

        except ImportError:
            logging.info("⚠️ Playwright未安装，回退到html2image...")
            raise Exception("Playwright未安装")
        except Exception as e:
            logging.info(f"⚠️ Playwright截图失败: {str(e)}，回退到html2image...")
            raise Exception(f"Playwright失败: {str(e)}")

    except Exception as e:
        # 回退到html2image
        logging.info("🔄 使用html2image回退方案...")

        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            await loop.run_in_executor(executor, _html_to_image_sync, html_content, output_path)

        logging.info("✅ html2image回退方案完成")

async def generate_teaching_evaluation(text: str, stream: bool = True):
    """
    生成智能教学评价

    Args:
        text: 转录文本内容
        stream: 是否使用流式响应

    Returns:
        生成的教学评价内容
    """
    evaluation_prompt = """请你对这个老师上的课进行专业教学评价，从以下8个维度进行详细分析：

## 评价维度

### 1. **课堂导入** (10分)
- 导入方式是否新颖有趣，能否吸引学生注意力
- 是否能够激发学生的学习兴趣和求知欲
- 导入与本节课内容的关联度是否恰当

### 2. **课程重点** (15分)
- 课程重点是否明确突出
- 重点内容的讲解是否充分到位
- 学生是否能够清楚掌握本节课的核心知识

### 3. **课程难点** (15分)
- 难点识别是否准确
- 难点突破的方法是否有效
- 是否采用了合适的教学策略化解难点

### 4. **课堂设计** (10分)
- 教学环节设计是否合理有序
- 时间分配是否恰当
- 教学活动是否丰富多样

### 5. **内容讲解深度** (15分)
- 知识点讲解是否深入透彻
- 是否能够揭示知识的本质和内在联系
- 理论阐述是否清晰准确

### 6. **内容讲解广度** (10分)
- 知识面覆盖是否全面
- 是否涉及相关的背景知识
- 内容的丰富性和完整性如何

### 7. **知识延伸** (10分)
- 是否进行了适当的知识拓展
- 是否联系实际生活或其他学科
- 是否培养了学生的发散思维

### 8. **课堂总结** (10分)
- 是否有明确的课堂小结
- 总结是否突出重点，梳理知识脉络
- 是否引导学生进行反思和巩固

### 9. **综合评分** (5分)
- 整体教学效果评价
- 教学目标达成度
- 学生参与度和课堂氛围

## 输出要求
请使用Markdown格式，对每个维度进行详细分析，给出具体的评分和改进建议，最后给出综合评分（满分100分）。

课程内容："""

    try:
        response = await client.chat.completions.create(
            model=AI_CONFIG["model"],
            messages=[
                {"role": "system", "content": evaluation_prompt},
                {"role": "user", "content": text}
            ],
            stream=stream,
            temperature=0.7,  # 稍微增加创造性
            max_tokens=2000   # 确保有足够的token生成详细评价
        )

        if stream:
            async for chunk in response:
                # 安全检查：确保choices数组不为空且包含delta内容
                if (chunk.choices and
                    len(chunk.choices) > 0 and
                    hasattr(chunk.choices[0], 'delta') and
                    chunk.choices[0].delta.content is not None):
                    yield chunk.choices[0].delta.content
        else:
            # 非流式响应，直接返回完整内容
            if response.choices and len(response.choices) > 0:
                yield response.choices[0].message.content

    except Exception as e:
        logging.error(f"❌ 生成教学评价失败: {str(e)}")
        raise Exception(f"生成教学评价失败: {str(e)}")

async def export_content_to_image(content: str, title: str, content_type: str) -> dict:
    """
    将Markdown内容转换为图片

    Args:
        content (str): Markdown内容
        title (str): 标题
        content_type (str): 内容类型 (summary/evaluation/mindmap)

    Returns:
        dict: 包含图片路径和访问URL的字典

    Raises:
        Exception: 当转换过程中发生错误时
    """
    try:
        # 确保exports目录存在
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        exports_dir = os.path.join(base_dir, "uploads", "exports")
        os.makedirs(exports_dir, exist_ok=True)

        # 生成唯一的文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{content_type}_{timestamp}_{unique_id}.png"
        image_path = os.path.join(exports_dir, filename)

        # 生成HTML内容
        html_content = _generate_content_html(content, title, content_type)
        logging.info(f"📄 生成HTML内容，长度: {len(html_content)} 字符")

        # 转换为图片
        await _html_to_image(html_content, image_path)

        # 构建访问URL
        image_url = f"/uploads/exports/{filename}"

        logging.info(f"✅ 内容导出完成: {image_url}")
        return {
            "image_path": image_path,
            "image_url": image_url
        }

    except Exception as e:
        logging.error(f"❌ 内容导出失败: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"内容导出失败: {str(e)}")

def _generate_content_html(content: str, title: str, content_type: str) -> str:
    """
    生成用于导出的HTML内容

    Args:
        content (str): Markdown内容
        title (str): 标题
        content_type (str): 内容类型

    Returns:
        str: 完整的HTML内容
    """
    # 将Markdown转换为HTML
    import markdown

    # 配置markdown扩展
    md = markdown.Markdown(extensions=[
        'markdown.extensions.tables',
        'markdown.extensions.fenced_code',
        'markdown.extensions.codehilite',
        'markdown.extensions.toc'
    ])

    html_body = md.convert(content)

    # 根据内容类型设置不同的样式主题
    theme_colors = {
        'summary': {'primary': '#1890ff', 'secondary': '#e6f7ff', 'accent': '#096dd9'},
        'evaluation': {'primary': '#52c41a', 'secondary': '#f6ffed', 'accent': '#389e0d'},
        'mindmap': {'primary': '#722ed1', 'secondary': '#f9f0ff', 'accent': '#531dab'}
    }

    colors = theme_colors.get(content_type, theme_colors['summary'])

    html_template = f"""
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <script>
            // 动态调整页面高度
            window.addEventListener('load', function() {{
                const container = document.querySelector('.container');
                if (container) {{
                    const height = container.offsetHeight;
                    document.body.style.height = (height + 40) + 'px';  // 添加小量缓冲
                    document.documentElement.style.height = (height + 40) + 'px';
                }}
            }});
        </script>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #ffffff 0%, {colors['secondary']} 100%);
                min-height: auto;  /* 自适应高度 */
                padding: 20px;  /* 减少padding */
                line-height: 1.6;
                color: #333;
                margin: 0;
                box-sizing: border-box;
            }}
            .container {{
                max-width: 1000px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                overflow: visible;
                min-height: auto;
                position: relative;
                display: inline-block;  /* 使容器紧贴内容 */
                width: 100%;
            }}
            .header {{
                background: linear-gradient(135deg, {colors['primary']} 0%, {colors['accent']} 100%);
                color: white;
                padding: 30px 40px;
                text-align: center;
            }}
            .header h1 {{
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 8px;
            }}
            .header .subtitle {{
                font-size: 14px;
                opacity: 0.9;
            }}
            .content {{
                padding: 30px;  /* 减少padding */
                min-height: auto;
                overflow: visible;
                position: relative;
            }}
            h1, h2, h3, h4, h5, h6 {{
                color: {colors['primary']};
                margin-top: 24px;
                margin-bottom: 16px;
                font-weight: 600;
            }}
            h1 {{ font-size: 24px; }}
            h2 {{ font-size: 20px; }}
            h3 {{ font-size: 18px; }}
            h4 {{ font-size: 16px; }}
            p {{
                margin-bottom: 16px;
                text-align: justify;
            }}
            ul, ol {{
                margin-bottom: 16px;
                padding-left: 24px;
            }}
            li {{
                margin-bottom: 8px;
            }}
            blockquote {{
                border-left: 4px solid {colors['primary']};
                background: {colors['secondary']};
                padding: 16px 20px;
                margin: 16px 0;
                border-radius: 0 8px 8px 0;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }}
            th, td {{
                padding: 12px 16px;
                text-align: left;
                border-bottom: 1px solid #f0f0f0;
            }}
            th {{
                background: {colors['primary']};
                color: white;
                font-weight: 600;
            }}
            tr:nth-child(even) {{
                background: {colors['secondary']};
            }}
            code {{
                background: #f5f5f5;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 0.9em;
            }}
            pre {{
                background: #f5f5f5;
                padding: 16px;
                border-radius: 8px;
                overflow-x: auto;
                margin: 16px 0;
            }}
            .footer {{
                background: #f8f9fa;
                padding: 15px 30px;  /* 减少padding */
                text-align: center;
                color: #666;
                font-size: 12px;
                border-top: 1px solid #e9ecef;
                margin-top: 12px;  /* 减少margin */
                position: relative;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{title}</h1>
                <div class="subtitle">由 VideoChat AI 生成 • {datetime.now().strftime('%Y年%m月%d日 %H:%M')}</div>
            </div>
            <div class="content">
                {html_body}
            </div>
            <div class="footer">
                VideoChat - 智能视频分析平台 | 让AI为您的内容增值
            </div>
        </div>
    </body>
    </html>
    """

    return html_template