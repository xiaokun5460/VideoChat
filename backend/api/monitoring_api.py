"""
监控API端点

提供系统监控、日志查询和运维管理的API接口
"""

import asyncio
import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse, HTMLResponse
from pydantic import BaseModel
from utils.logger import logger, LogCategory
from utils.metrics import metrics_collector
from middleware.monitoring import health_check_middleware
from pathlib import Path


# 创建路由器
router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


class LogQuery(BaseModel):
    """日志查询请求"""
    level: Optional[str] = None
    category: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    limit: int = 100


class AlertRule(BaseModel):
    """告警规则"""
    name: str
    metric: str
    threshold: float
    operator: str  # gt, lt, eq, gte, lte
    duration: int  # 持续时间（秒）
    enabled: bool = True


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """健康检查端点"""
    try:
        health_status = await health_check_middleware.perform_health_checks()
        
        # 添加额外的健康检查
        health_status["checks"]["database"] = await _check_database_health()
        health_status["checks"]["cache"] = await _check_cache_health()
        health_status["checks"]["disk_space"] = await _check_disk_space()
        
        # 重新计算整体状态
        healthy_checks = sum(1 for check in health_status["checks"].values() 
                           if check.get("status") == "healthy")
        total_checks = len(health_status["checks"])
        
        if healthy_checks == total_checks:
            health_status["status"] = "healthy"
        elif healthy_checks >= total_checks * 0.7:
            health_status["status"] = "degraded"
        else:
            health_status["status"] = "unhealthy"
        
        return health_status
    
    except Exception as e:
        logger.error("健康检查失败", category=LogCategory.SYSTEM, exception=e)
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }


async def _check_database_health() -> Dict[str, Any]:
    """检查数据库健康状态"""
    try:
        from database.connection import get_database
        
        with get_database() as session:
            # 执行简单查询测试连接
            session.execute("SELECT 1")
            return {"status": "healthy", "message": "数据库连接正常"}
    
    except ImportError:
        return {"status": "healthy", "message": "数据库模块未启用"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def _check_cache_health() -> Dict[str, Any]:
    """检查缓存健康状态"""
    try:
        from utils.simple_cache import simple_cache_manager
        
        # 测试缓存读写
        test_key = "health_check_test"
        test_value = {"timestamp": time.time()}
        
        simple_cache_manager.set(test_key, test_value, ttl_seconds=60)
        retrieved = simple_cache_manager.get(test_key)
        
        if retrieved and retrieved.get("timestamp") == test_value["timestamp"]:
            return {"status": "healthy", "message": "缓存工作正常"}
        else:
            return {"status": "unhealthy", "error": "缓存读写测试失败"}
    
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def _check_disk_space() -> Dict[str, Any]:
    """检查磁盘空间"""
    try:
        import shutil
        
        # 检查当前目录的磁盘空间
        total, used, free = shutil.disk_usage(".")
        free_percent = (free / total) * 100
        
        if free_percent > 20:
            status = "healthy"
        elif free_percent > 10:
            status = "warning"
        else:
            status = "unhealthy"
        
        return {
            "status": status,
            "free_percent": free_percent,
            "free_gb": free / (1024**3),
            "total_gb": total / (1024**3)
        }
    
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """获取所有指标"""
    try:
        metrics = metrics_collector.get_all_metrics()
        
        return {
            "status": "success",
            "data": metrics,
            "timestamp": time.time()
        }
    
    except Exception as e:
        logger.error("获取指标失败", category=LogCategory.SYSTEM, exception=e)
        raise HTTPException(status_code=500, detail=f"获取指标失败: {str(e)}")


@router.get("/metrics/prometheus")
async def get_prometheus_metrics() -> PlainTextResponse:
    """获取Prometheus格式的指标"""
    try:
        prometheus_data = metrics_collector.get_prometheus_format()
        return PlainTextResponse(prometheus_data, media_type="text/plain")
    
    except Exception as e:
        logger.error("获取Prometheus指标失败", category=LogCategory.SYSTEM, exception=e)
        raise HTTPException(status_code=500, detail=f"获取Prometheus指标失败: {str(e)}")


@router.get("/logs")
async def get_logs(
    level: Optional[str] = Query(None, description="日志级别"),
    category: Optional[str] = Query(None, description="日志分类"),
    limit: int = Query(100, description="返回条数限制")
) -> Dict[str, Any]:
    """获取日志"""
    try:
        # 这里应该从日志文件或日志存储中读取
        # 目前返回模拟数据
        logs = [
            {
                "timestamp": time.time() - 60,
                "level": "INFO",
                "category": "api",
                "message": "API请求处理完成",
                "data": {"method": "GET", "path": "/api/health", "duration": 45.2}
            },
            {
                "timestamp": time.time() - 120,
                "level": "WARNING",
                "category": "performance",
                "message": "内存使用率较高",
                "data": {"memory_percent": 85.3}
            },
            {
                "timestamp": time.time() - 180,
                "level": "ERROR",
                "category": "transcription",
                "message": "转录任务失败",
                "data": {"task_id": "abc123", "error": "文件格式不支持"}
            }
        ]
        
        # 应用过滤器
        if level:
            logs = [log for log in logs if log["level"].lower() == level.lower()]
        
        if category:
            logs = [log for log in logs if log["category"].lower() == category.lower()]
        
        # 限制返回数量
        logs = logs[:limit]
        
        return {
            "status": "success",
            "data": logs,
            "total": len(logs),
            "timestamp": time.time()
        }
    
    except Exception as e:
        logger.error("获取日志失败", category=LogCategory.SYSTEM, exception=e)
        raise HTTPException(status_code=500, detail=f"获取日志失败: {str(e)}")


@router.get("/dashboard")
async def get_dashboard() -> HTMLResponse:
    """获取监控仪表板"""
    try:
        dashboard_path = Path(__file__).parent.parent.parent / "monitoring" / "dashboard.html"
        
        if dashboard_path.exists():
            with open(dashboard_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HTMLResponse(content=content)
        else:
            return HTMLResponse(
                content="<h1>监控仪表板</h1><p>仪表板文件未找到</p>",
                status_code=404
            )
    
    except Exception as e:
        logger.error("获取仪表板失败", category=LogCategory.SYSTEM, exception=e)
        raise HTTPException(status_code=500, detail=f"获取仪表板失败: {str(e)}")


@router.get("/system/info")
async def get_system_info() -> Dict[str, Any]:
    """获取系统信息"""
    try:
        import platform
        import sys
        from config import AI_CONFIG, STT_CONFIG, DOWNLOAD_CONFIG, APP_NAME, APP_VERSION, ENVIRONMENT, DEBUG_MODE, LOG_LEVEL

        system_info = {
            "platform": {
                "system": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
                "processor": platform.processor()
            },
            "python": {
                "version": sys.version,
                "executable": sys.executable
            },
            "application": {
                "name": APP_NAME,
                "version": APP_VERSION,
                "environment": ENVIRONMENT
            },
            "configuration": {
                "debug": DEBUG_MODE,
                "log_level": LOG_LEVEL
            }
        }
        
        return {
            "status": "success",
            "data": system_info,
            "timestamp": time.time()
        }
    
    except Exception as e:
        logger.error("获取系统信息失败", category=LogCategory.SYSTEM, exception=e)
        raise HTTPException(status_code=500, detail=f"获取系统信息失败: {str(e)}")


@router.post("/alerts/test")
async def test_alert() -> Dict[str, Any]:
    """测试告警功能"""
    try:
        # 记录测试告警
        logger.warning(
            "告警测试",
            category=LogCategory.SYSTEM,
            extra_data={
                "alert_type": "test",
                "severity": "warning",
                "message": "这是一个测试告警"
            }
        )
        
        return {
            "status": "success",
            "message": "测试告警已发送",
            "timestamp": time.time()
        }
    
    except Exception as e:
        logger.error("测试告警失败", category=LogCategory.SYSTEM, exception=e)
        raise HTTPException(status_code=500, detail=f"测试告警失败: {str(e)}")


@router.get("/stats/summary")
async def get_stats_summary() -> Dict[str, Any]:
    """获取统计摘要"""
    try:
        # 获取各种统计信息
        metrics = metrics_collector.get_all_metrics()
        
        # 计算摘要统计
        summary = {
            "requests": {
                "total": metrics.get("http_requests_total", {}).get("value", 0),
                "errors": metrics.get("http_requests_errors_total", {}).get("value", 0),
                "error_rate": 0
            },
            "transcription": {
                "total": metrics.get("transcription_requests_total", {}).get("value", 0),
                "completed": metrics.get("transcription_completed_total", {}).get("value", 0),
                "failed": metrics.get("transcription_failed_total", {}).get("value", 0),
                "success_rate": 0
            },
            "cache": {
                "hits": metrics.get("cache_hits_total", {}).get("value", 0),
                "misses": metrics.get("cache_misses_total", {}).get("value", 0),
                "hit_rate": 0
            },
            "system": {
                "cpu_usage": metrics.get("cpu_usage_percent", {}).get("value", 0),
                "memory_usage": metrics.get("memory_usage_percent", {}).get("value", 0),
                "active_connections": metrics.get("active_connections", {}).get("value", 0)
            }
        }
        
        # 计算比率
        if summary["requests"]["total"] > 0:
            summary["requests"]["error_rate"] = (
                summary["requests"]["errors"] / summary["requests"]["total"] * 100
            )
        
        if summary["transcription"]["total"] > 0:
            summary["transcription"]["success_rate"] = (
                summary["transcription"]["completed"] / summary["transcription"]["total"] * 100
            )
        
        total_cache_requests = summary["cache"]["hits"] + summary["cache"]["misses"]
        if total_cache_requests > 0:
            summary["cache"]["hit_rate"] = (
                summary["cache"]["hits"] / total_cache_requests * 100
            )
        
        return {
            "status": "success",
            "data": summary,
            "timestamp": time.time()
        }
    
    except Exception as e:
        logger.error("获取统计摘要失败", category=LogCategory.SYSTEM, exception=e)
        raise HTTPException(status_code=500, detail=f"获取统计摘要失败: {str(e)}")


# 注册健康检查函数
async def _register_health_checks():
    """注册健康检查函数"""
    await health_check_middleware.register_health_check("api", lambda: True)
    await health_check_middleware.register_health_check("logger", lambda: True)
    await health_check_middleware.register_health_check("metrics", lambda: True)


# 初始化时注册健康检查
asyncio.create_task(_register_health_checks())
