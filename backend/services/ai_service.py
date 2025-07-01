"""
AI服务模块

提供各种AI功能，包括文本总结、思维导图生成、对话等
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import AsyncGenerator, Dict, List, Optional, Any

from .base import BaseService
from core.models import ChatMessage, AIResult
from core.exceptions import ai_service_error, AIServiceException, ErrorCodes
from core.config import settings


class AIService(BaseService):
    """AI服务"""
    
    def __init__(self):
        super().__init__()
        self._client = None
        self._results_db = {}  # 临时内存存储AI结果
        self._initialize_client()
    
    def _initialize_client(self):
        """初始化AI客户端"""
        try:
            if settings.openai_api_key:
                # 动态导入，避免在没有安装openai包时出错
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(
                    api_key=settings.openai_api_key,
                    base_url=settings.openai_base_url
                )
                self.log_info("AI客户端初始化成功")
            else:
                self.log_warning("未配置OpenAI API密钥，AI功能将不可用")
        except ImportError:
            self.log_error("OpenAI包未安装，AI功能将不可用")
        except Exception as e:
            self.log_error("AI客户端初始化失败", exception=e)
    
    def _check_client(self):
        """检查AI客户端是否可用"""
        if not self._client:
            raise ai_service_error("OpenAI", "AI服务未正确配置")
    
    async def generate_summary(
        self, 
        text: str, 
        stream: bool = False,
        max_length: int = 200
    ) -> AsyncGenerator[str, None]:
        """
        生成文本总结
        
        Args:
            text: 待总结的文本
            stream: 是否流式响应
            max_length: 最大长度
            
        Yields:
            str: 总结内容片段
        """
        self._check_client()
        
        try:
            response = await self._client.chat.completions.create(
                model=settings.ai_model_name,
                messages=[
                    {
                        "role": "system", 
                        "content": f"请对以下内容进行总结，控制在{max_length}字以内："
                    },
                    {"role": "user", "content": text}
                ],
                stream=stream,
                max_tokens=max_length * 2  # 预留一些token空间
            )
            
            if stream:
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            else:
                yield response.choices[0].message.content
                
        except Exception as e:
            self.log_error("生成总结失败", exception=e)
            raise ai_service_error("总结生成", str(e))
    
    async def generate_detailed_summary(
        self, 
        text: str, 
        stream: bool = False
    ) -> AsyncGenerator[str, None]:
        """生成详细总结"""
        self._check_client()
        
        try:
            response = await self._client.chat.completions.create(
                model=settings.ai_model_name,
                messages=[
                    {
                        "role": "system", 
                        "content": """请对以下内容进行详细分析和总结，包括：
                        1. 主要观点和核心内容
                        2. 关键信息和重要细节
                        3. 逻辑结构和论证过程
                        4. 结论和启示
                        请用清晰的结构化格式呈现。"""
                    },
                    {"role": "user", "content": text}
                ],
                stream=stream,
                max_tokens=2000
            )
            
            if stream:
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            else:
                yield response.choices[0].message.content
                
        except Exception as e:
            self.log_error("生成详细总结失败", exception=e)
            raise ai_service_error("详细总结生成", str(e))
    
    async def generate_mindmap(
        self, 
        text: str, 
        stream: bool = False
    ) -> AsyncGenerator[str, None]:
        """生成思维导图"""
        self._check_client()
        
        try:
            response = await self._client.chat.completions.create(
                model=settings.ai_model_name,
                messages=[
                    {
                        "role": "system", 
                        "content": """你是一个思维导图生成专家。请将内容转换为思维导图的JSON结构。
                        格式要求：
                        {
                            "name": "主题名称",
                            "children": [
                                {
                                    "name": "子主题1",
                                    "children": [
                                        {"name": "细节1"},
                                        {"name": "细节2"}
                                    ]
                                }
                            ]
                        }
                        只返回JSON，不要其他说明文字。"""
                    },
                    {"role": "user", "content": text}
                ],
                stream=stream,
                max_tokens=1500
            )
            
            if stream:
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            else:
                yield response.choices[0].message.content
                
        except Exception as e:
            self.log_error("生成思维导图失败", exception=e)
            raise ai_service_error("思维导图生成", str(e))
    
    async def chat_with_model(
        self, 
        messages: List[ChatMessage], 
        context: str = "", 
        stream: bool = False
    ) -> AsyncGenerator[str, None]:
        """AI对话"""
        self._check_client()
        
        try:
            # 构建完整的消息列表
            full_messages = []
            
            # 添加系统消息
            system_content = "你是一个智能助手，请根据提供的上下文信息回答用户问题。"
            if context:
                system_content += f"\n\n上下文信息：\n{context}"
            
            full_messages.append({
                "role": "system",
                "content": system_content
            })
            
            # 添加对话历史
            for message in messages:
                full_messages.append({
                    "role": message.role,
                    "content": message.content
                })
            
            response = await self._client.chat.completions.create(
                model=settings.ai_model_name,
                messages=full_messages,
                stream=stream,
                max_tokens=1000
            )
            
            if stream:
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            else:
                yield response.choices[0].message.content
                
        except Exception as e:
            self.log_error("AI对话失败", exception=e)
            raise ai_service_error("对话处理", str(e))
    
    async def generate_teaching_evaluation(
        self, 
        text: str, 
        stream: bool = False
    ) -> AsyncGenerator[str, None]:
        """生成教学评估"""
        self._check_client()
        
        try:
            response = await self._client.chat.completions.create(
                model=settings.ai_model_name,
                messages=[
                    {
                        "role": "system", 
                        "content": """请对以下教学内容进行专业评估，从以下维度分析：
                        1. 课程介绍 (20分)：内容是否清晰、吸引人
                        2. 重点讲解 (25分)：核心知识点是否突出、易懂
                        3. 课程设计 (25分)：结构是否合理、逻辑清晰
                        4. 内容组织 (20分)：信息是否有序、连贯
                        5. 反思总结 (10分)：是否有效总结和启发
                        
                        请给出具体评分和改进建议，总分100分。"""
                    },
                    {"role": "user", "content": text}
                ],
                stream=stream,
                max_tokens=2000
            )
            
            if stream:
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            else:
                yield response.choices[0].message.content
                
        except Exception as e:
            self.log_error("生成教学评估失败", exception=e)
            raise ai_service_error("教学评估生成", str(e))
    
    async def save_ai_result(
        self, 
        result_type: str, 
        content: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """保存AI处理结果"""
        result_id = str(uuid.uuid4())
        
        result_data = {
            "id": result_id,
            "type": result_type,
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.now().isoformat()
        }
        
        self._results_db[result_id] = result_data
        return result_id
    
    async def get_ai_result(self, result_id: str) -> Optional[Dict[str, Any]]:
        """获取AI处理结果"""
        return self._results_db.get(result_id)
    
    async def get_ai_stats(self) -> Dict[str, Any]:
        """获取AI服务统计信息"""
        all_results = list(self._results_db.values())
        
        stats = {
            "total_results": len(all_results),
            "by_type": {},
            "client_available": self._client is not None
        }
        
        # 按类型统计
        for result in all_results:
            result_type = result["type"]
            stats["by_type"][result_type] = stats["by_type"].get(result_type, 0) + 1
        
        return stats
    
    async def test_connection(self) -> bool:
        """测试AI服务连接"""
        try:
            # 简单的连接测试
            if not self.openai_client:
                return False
            
            # 尝试一个简单的API调用
            test_messages = [{"role": "user", "content": "test"}]
            
            # 使用较短的超时时间进行测试
            response = await asyncio.wait_for(
                self.openai_client.chat.completions.create(
                    model=self.model_name,
                    messages=test_messages,
                    max_tokens=1,
                    temperature=0
                ),
                timeout=5.0  # 5秒超时
            )
            
            return response is not None
            
        except asyncio.TimeoutError:
            self.log_warning("AI服务连接测试超时")
            return False
        except Exception as e:
            self.log_warning(f"AI服务连接测试失败: {str(e)}")
            return False