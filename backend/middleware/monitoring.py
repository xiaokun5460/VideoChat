"""
监控中间件

提供API请求监控、性能指标收集和健康检查功能
"""

import time
import uuid
import asyncio
from typing import Callable, Dict, Any, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from utils.logger import logger, LogCategory
from utils.metrics import metrics_collector


class MonitoringMiddleware(BaseHTTPMiddleware):
    """监控中间件"""
    
    def __init__(self, app, exclude_paths: Optional[list] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/metrics", "/docs", "/openapi.json"]
        self.request_count = 0
        self.active_requests = 0
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """处理请求监控"""
        # 生成请求ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # 设置日志上下文
        logger.set_context(request_id=request_id)
        
        # 记录请求开始
        start_time = time.time()
        self.request_count += 1
        self.active_requests += 1
        
        # 获取客户端信息
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        try:
            # 处理请求
            response = await call_next(request)
            
            # 计算处理时间
            duration_ms = (time.time() - start_time) * 1000
            
            # 记录请求日志
            if request.url.path not in self.exclude_paths:
                logger.log_api_request(
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                    user_agent=user_agent,
                    ip_address=client_ip
                )
                
                # 收集指标
                metrics_collector.record_request(
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    duration_ms=duration_ms
                )
            
            # 添加响应头
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
            
            return response
        
        except Exception as e:
            # 记录异常
            duration_ms = (time.time() - start_time) * 1000
            
            logger.error(
                f"Request failed: {request.method} {request.url.path}",
                category=LogCategory.API,
                exception=e,
                extra_data={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                    "user_agent": user_agent
                }
            )
            
            # 收集错误指标
            metrics_collector.record_error(
                method=request.method,
                path=request.url.path,
                error_type=type(e).__name__
            )
            
            # 返回错误响应
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "request_id": request_id,
                    "timestamp": time.time()
                },
                headers={"X-Request-ID": request_id}
            )
        
        finally:
            self.active_requests -= 1
            logger.set_context()  # 清除上下文
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP地址"""
        # 检查代理头
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # 使用客户端地址
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def get_stats(self) -> Dict[str, Any]:
        """获取中间件统计信息"""
        return {
            "total_requests": self.request_count,
            "active_requests": self.active_requests
        }


class HealthCheckMiddleware:
    """健康检查中间件"""
    
    def __init__(self):
        self.start_time = time.time()
        self.health_checks = {}
        self.last_check_time = 0
        self.check_interval = 30  # 30秒检查一次
    
    async def register_health_check(self, name: str, check_func: Callable):
        """注册健康检查函数"""
        self.health_checks[name] = check_func
    
    async def perform_health_checks(self) -> Dict[str, Any]:
        """执行健康检查"""
        current_time = time.time()
        
        # 检查是否需要更新
        if current_time - self.last_check_time < self.check_interval:
            return self._get_cached_health_status()
        
        health_status = {
            "status": "healthy",
            "timestamp": current_time,
            "uptime_seconds": current_time - self.start_time,
            "checks": {}
        }
        
        overall_healthy = True
        
        for name, check_func in self.health_checks.items():
            try:
                if asyncio.iscoroutinefunction(check_func):
                    result = await check_func()
                else:
                    result = check_func()
                
                health_status["checks"][name] = {
                    "status": "healthy" if result else "unhealthy",
                    "details": result if isinstance(result, dict) else {"result": result}
                }
                
                if not result:
                    overall_healthy = False
            
            except Exception as e:
                health_status["checks"][name] = {
                    "status": "error",
                    "error": str(e)
                }
                overall_healthy = False
        
        health_status["status"] = "healthy" if overall_healthy else "unhealthy"
        self.last_check_time = current_time
        self._cached_health_status = health_status
        
        return health_status
    
    def _get_cached_health_status(self) -> Dict[str, Any]:
        """获取缓存的健康状态"""
        return getattr(self, '_cached_health_status', {
            "status": "unknown",
            "timestamp": time.time(),
            "uptime_seconds": time.time() - self.start_time,
            "checks": {}
        })


class RateLimitMiddleware(BaseHTTPMiddleware):
    """简单的速率限制中间件"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_times = {}
        self.cleanup_interval = 60  # 1分钟清理一次
        self.last_cleanup = time.time()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """处理速率限制"""
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # 定期清理过期记录
        if current_time - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_requests(current_time)
            self.last_cleanup = current_time
        
        # 检查速率限制
        if self._is_rate_limited(client_ip, current_time):
            logger.warning(
                f"Rate limit exceeded for IP: {client_ip}",
                category=LogCategory.SECURITY,
                extra_data={"client_ip": client_ip, "limit": self.requests_per_minute}
            )
            
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute.",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        # 记录请求时间
        self._record_request(client_ip, current_time)
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP地址"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _is_rate_limited(self, client_ip: str, current_time: float) -> bool:
        """检查是否超过速率限制"""
        if client_ip not in self.request_times:
            return False
        
        # 计算最近一分钟的请求数
        recent_requests = [
            req_time for req_time in self.request_times[client_ip]
            if current_time - req_time < 60
        ]
        
        return len(recent_requests) >= self.requests_per_minute
    
    def _record_request(self, client_ip: str, current_time: float):
        """记录请求时间"""
        if client_ip not in self.request_times:
            self.request_times[client_ip] = []
        
        self.request_times[client_ip].append(current_time)
    
    def _cleanup_old_requests(self, current_time: float):
        """清理过期的请求记录"""
        for client_ip in list(self.request_times.keys()):
            # 只保留最近一分钟的请求
            self.request_times[client_ip] = [
                req_time for req_time in self.request_times[client_ip]
                if current_time - req_time < 60
            ]
            
            # 如果没有最近的请求，删除该IP的记录
            if not self.request_times[client_ip]:
                del self.request_times[client_ip]


# 全局中间件实例
monitoring_middleware = None
health_check_middleware = HealthCheckMiddleware()
rate_limit_middleware = None


def create_monitoring_middleware(exclude_paths: Optional[list] = None):
    """创建监控中间件"""
    global monitoring_middleware
    monitoring_middleware = MonitoringMiddleware(None, exclude_paths)
    return monitoring_middleware


def create_rate_limit_middleware(requests_per_minute: int = 60):
    """创建速率限制中间件"""
    global rate_limit_middleware
    rate_limit_middleware = RateLimitMiddleware(None, requests_per_minute)
    return rate_limit_middleware
