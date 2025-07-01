"""
基础服务类

定义所有服务的基础接口和通用功能
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from core.config import settings
from core.exceptions import VideoChateException


class BaseService(ABC):
    """基础服务类"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.settings = settings
    
    def log_info(self, message: str, **kwargs):
        """记录信息日志"""
        self.logger.info(message, extra=kwargs)
    
    def log_warning(self, message: str, **kwargs):
        """记录警告日志"""
        self.logger.warning(message, extra=kwargs)
    
    def log_error(self, message: str, exception: Exception = None, **kwargs):
        """记录错误日志"""
        if exception:
            self.logger.error(message, exc_info=exception, extra=kwargs)
        else:
            self.logger.error(message, extra=kwargs)
    
    def validate_required_params(self, params: Dict[str, Any], required_keys: List[str]):
        """验证必需参数"""
        missing_keys = [key for key in required_keys if key not in params or params[key] is None]
        if missing_keys:
            raise VideoChateException(
                message=f"缺少必需参数: {', '.join(missing_keys)}",
                code="E1006",
                status_code=400
            )
    
    def safe_execute(self, operation_name: str, operation_func, *args, **kwargs):
        """安全执行操作，统一异常处理"""
        try:
            self.log_info(f"开始执行操作: {operation_name}")
            result = operation_func(*args, **kwargs)
            self.log_info(f"操作完成: {operation_name}")
            return result
        except VideoChateException:
            # 重新抛出业务异常
            raise
        except Exception as e:
            self.log_error(f"操作失败: {operation_name}", exception=e)
            raise VideoChateException(
                message=f"操作执行失败: {operation_name}",
                code="E1005",
                status_code=500
            )
    
    async def async_safe_execute(self, operation_name: str, operation_func, *args, **kwargs):
        """异步安全执行操作"""
        try:
            self.log_info(f"开始执行异步操作: {operation_name}")
            result = await operation_func(*args, **kwargs)
            self.log_info(f"异步操作完成: {operation_name}")
            return result
        except VideoChateException:
            # 重新抛出业务异常
            raise
        except Exception as e:
            self.log_error(f"异步操作失败: {operation_name}", exception=e)
            raise VideoChateException(
                message=f"异步操作执行失败: {operation_name}",
                code="E1005",
                status_code=500
            )


class CRUDService(BaseService):
    """CRUD服务基类"""
    
    @abstractmethod
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """创建资源"""
        pass
    
    @abstractmethod
    async def get_by_id(self, resource_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取资源"""
        pass
    
    @abstractmethod
    async def get_list(
        self, 
        page: int = 1, 
        page_size: int = 20, 
        filters: Optional[Dict[str, Any]] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """获取资源列表"""
        pass
    
    @abstractmethod
    async def update(self, resource_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """更新资源"""
        pass
    
    @abstractmethod
    async def delete(self, resource_id: str) -> bool:
        """删除资源"""
        pass


class TaskService(BaseService):
    """任务服务基类"""
    
    @abstractmethod
    async def create_task(
        self, 
        task_type: str, 
        parameters: Dict[str, Any]
    ) -> str:
        """创建任务"""
        pass
    
    @abstractmethod
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """获取任务状态"""
        pass
    
    @abstractmethod
    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        pass
    
    @abstractmethod
    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务结果"""
        pass
