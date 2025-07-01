"""
AI服务API路由

基于AIService的AI功能接口
"""

from typing import List
from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse

from core.response import response_manager
from core.models import AIRequest, ChatRequest, ChatMessage
from core.exceptions import VideoChateException, AIServiceException, ErrorCodes
from services import ai_service


router = APIRouter(prefix="/api/ai", tags=["AI服务"])


@router.post("/summary", summary="生成内容总结")
async def create_summary(request: AIRequest):
    """
    基于文本内容生成AI总结
    
    - **text**: 待总结的文本内容
    - **stream**: 是否使用流式响应
    - **parameters**: 可选参数，如max_length等
    """
    try:
        max_length = 200
        if request.parameters and "max_length" in request.parameters:
            max_length = request.parameters["max_length"]
        
        if request.stream:
            # 流式响应
            async def generate_summary_stream():
                try:
                    async for chunk in ai_service.generate_summary(
                        request.text, 
                        stream=True, 
                        max_length=max_length
                    ):
                        yield f"data: {chunk}\n\n"
                except Exception as e:
                    yield f"data: [ERROR] {str(e)}\n\n"
            
            return StreamingResponse(
                generate_summary_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            # 非流式响应
            summary_content = ""
            async for chunk in ai_service.generate_summary(
                request.text, 
                stream=False, 
                max_length=max_length
            ):
                summary_content += chunk
            
            # 保存结果
            result_id = await ai_service.save_ai_result(
                "summary", summary_content, {"max_length": max_length}
            )
            
            return response_manager.success(
                data={
                    "summary": summary_content,
                    "result_id": result_id
                },
                message="总结生成成功"
            )
            
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"生成总结失败: {str(e)}",
            code=ErrorCodes.AI_SERVICE_ERROR
        )


@router.post("/detailed-summary", summary="生成详细总结")
async def create_detailed_summary(request: AIRequest):
    """
    生成深入的内容分析总结
    
    提供比普通总结更详细的分析和见解
    """
    try:
        if request.stream:
            # 流式响应
            async def generate_detailed_summary_stream():
                try:
                    async for chunk in ai_service.generate_detailed_summary(
                        request.text, stream=True
                    ):
                        yield f"data: {chunk}\n\n"
                except Exception as e:
                    yield f"data: [ERROR] {str(e)}\n\n"
            
            return StreamingResponse(
                generate_detailed_summary_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            # 非流式响应
            summary_content = ""
            async for chunk in ai_service.generate_detailed_summary(
                request.text, stream=False
            ):
                summary_content += chunk
            
            # 保存结果
            result_id = await ai_service.save_ai_result(
                "detailed_summary", summary_content
            )
            
            return response_manager.success(
                data={
                    "detailed_summary": summary_content,
                    "result_id": result_id
                },
                message="详细总结生成成功"
            )
            
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"生成详细总结失败: {str(e)}",
            code=ErrorCodes.AI_SERVICE_ERROR
        )


@router.post("/mindmap", summary="生成思维导图")
async def create_mindmap(request: AIRequest):
    """
    生成JSON格式思维导图数据
    
    将文本内容转换为结构化的思维导图
    """
    try:
        if request.stream:
            # 流式响应
            async def generate_mindmap_stream():
                try:
                    async for chunk in ai_service.generate_mindmap(
                        request.text, stream=True
                    ):
                        yield f"data: {chunk}\n\n"
                except Exception as e:
                    yield f"data: [ERROR] {str(e)}\n\n"
            
            return StreamingResponse(
                generate_mindmap_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            # 非流式响应
            mindmap_content = ""
            async for chunk in ai_service.generate_mindmap(
                request.text, stream=False
            ):
                mindmap_content += chunk
            
            # 保存结果
            result_id = await ai_service.save_ai_result(
                "mindmap", mindmap_content
            )
            
            return response_manager.success(
                data={
                    "mindmap": mindmap_content,
                    "result_id": result_id
                },
                message="思维导图生成成功"
            )
            
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"生成思维导图失败: {str(e)}",
            code=ErrorCodes.AI_SERVICE_ERROR
        )


@router.post("/chat", summary="智能对话")
async def chat(request: ChatRequest):
    """
    基于内容的AI对话助手
    
    - **messages**: 对话消息列表
    - **context**: 上下文信息（可选）
    - **stream**: 是否使用流式响应
    """
    try:
        if request.stream:
            # 流式响应
            async def generate_chat_stream():
                try:
                    async for chunk in ai_service.chat_with_model(
                        request.messages, 
                        request.context or "", 
                        stream=True
                    ):
                        yield f"data: {chunk}\n\n"
                except Exception as e:
                    yield f"data: [ERROR] {str(e)}\n\n"
            
            return StreamingResponse(
                generate_chat_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            # 非流式响应
            response_content = ""
            async for chunk in ai_service.chat_with_model(
                request.messages, 
                request.context or "", 
                stream=False
            ):
                response_content += chunk
            
            # 保存结果
            result_id = await ai_service.save_ai_result(
                "chat", response_content, {
                    "context": request.context,
                    "message_count": len(request.messages)
                }
            )
            
            return response_manager.success(
                data={
                    "response": response_content,
                    "result_id": result_id
                },
                message="对话响应成功"
            )
            
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"对话处理失败: {str(e)}",
            code=ErrorCodes.AI_SERVICE_ERROR
        )


@router.post("/teaching-evaluation", summary="教学内容评估")
async def create_teaching_evaluation(request: AIRequest):
    """
    对教学内容进行AI评估分析
    
    从多个维度评估教学内容的质量
    """
    try:
        if request.stream:
            # 流式响应
            async def generate_evaluation_stream():
                try:
                    async for chunk in ai_service.generate_teaching_evaluation(
                        request.text, stream=True
                    ):
                        yield f"data: {chunk}\n\n"
                except Exception as e:
                    yield f"data: [ERROR] {str(e)}\n\n"
            
            return StreamingResponse(
                generate_evaluation_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            # 非流式响应
            evaluation_content = ""
            async for chunk in ai_service.generate_teaching_evaluation(
                request.text, stream=False
            ):
                evaluation_content += chunk
            
            # 保存结果
            result_id = await ai_service.save_ai_result(
                "teaching_evaluation", evaluation_content
            )
            
            return response_manager.success(
                data={
                    "evaluation": evaluation_content,
                    "result_id": result_id
                },
                message="教学评估生成成功"
            )
            
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"生成教学评估失败: {str(e)}",
            code=ErrorCodes.AI_SERVICE_ERROR
        )


@router.get("/results/{result_id}", summary="获取AI处理结果")
async def get_ai_result(result_id: str):
    """
    根据结果ID获取AI处理结果
    
    用于获取之前保存的AI处理结果
    """
    try:
        result = await ai_service.get_ai_result(result_id)
        
        if not result:
            return response_manager.error(
                message="AI处理结果不存在",
                code=ErrorCodes.NOT_FOUND
            )
        
        return response_manager.success(
            data=result,
            message="AI处理结果获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取AI处理结果失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/stats/overview", summary="获取AI服务统计信息")
async def get_ai_stats():
    """
    获取AI服务统计信息
    
    包括处理次数、类型分布、服务状态等
    """
    try:
        stats = await ai_service.get_ai_stats()
        
        return response_manager.success(
            data=stats,
            message="AI服务统计信息获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取AI服务统计失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )
