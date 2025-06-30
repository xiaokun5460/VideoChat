"""
配置数据访问对象

处理系统配置的数据库操作
"""

import json
import logging
from typing import Any, Optional, Dict, List
from sqlalchemy.orm import Session
from database.models import SystemConfig
from database.connection import get_db_session


class ConfigDAO:
    """配置数据访问对象"""
    
    @staticmethod
    def set_config(
        key: str, 
        value: Any, 
        config_type: str = "string",
        description: str = None,
        is_system: bool = False,
        is_encrypted: bool = False
    ) -> bool:
        """设置配置"""
        try:
            # 序列化值
            if config_type == "json":
                value_str = json.dumps(value, ensure_ascii=False)
            elif config_type == "boolean":
                value_str = str(bool(value)).lower()
            elif config_type == "number":
                value_str = str(value)
            else:
                value_str = str(value)
            
            with get_db_session() as session:
                # 检查是否已存在
                existing = session.query(SystemConfig).filter(
                    SystemConfig.config_key == key
                ).first()
                
                if existing:
                    # 更新现有配置
                    existing.config_value = value_str
                    existing.config_type = config_type
                    if description is not None:
                        existing.description = description
                    existing.is_system = is_system
                    existing.is_encrypted = is_encrypted
                else:
                    # 创建新配置
                    config = SystemConfig(
                        config_key=key,
                        config_value=value_str,
                        config_type=config_type,
                        description=description,
                        is_system=is_system,
                        is_encrypted=is_encrypted
                    )
                    session.add(config)
                
                session.commit()
                return True
                
        except Exception as e:
            logging.info(f"❌ 设置配置失败: {e}")
            return False
    
    @staticmethod
    def get_config(key: str, default_value: Any = None) -> Any:
        """获取配置"""
        try:
            with get_db_session() as session:
                config = session.query(SystemConfig).filter(
                    SystemConfig.config_key == key
                ).first()
                
                if not config:
                    return default_value
                
                # 反序列化值
                if config.config_type == "json":
                    return json.loads(config.config_value)
                elif config.config_type == "boolean":
                    return config.config_value.lower() in ("true", "1", "yes")
                elif config.config_type == "number":
                    try:
                        if "." in config.config_value:
                            return float(config.config_value)
                        else:
                            return int(config.config_value)
                    except ValueError:
                        return default_value
                else:
                    return config.config_value
                    
        except Exception as e:
            logging.info(f"❌ 获取配置失败: {e}")
            return default_value
    
    @staticmethod
    def delete_config(key: str) -> bool:
        """删除配置"""
        try:
            with get_db_session() as session:
                deleted_count = session.query(SystemConfig).filter(
                    SystemConfig.config_key == key
                ).delete()
                session.commit()
                return deleted_count > 0
                
        except Exception as e:
            logging.info(f"❌ 删除配置失败: {e}")
            return False
    
    @staticmethod
    def get_all_configs(include_system: bool = True) -> Dict[str, Any]:
        """获取所有配置"""
        try:
            with get_db_session() as session:
                query = session.query(SystemConfig)
                
                if not include_system:
                    query = query.filter(SystemConfig.is_system == False)
                
                configs = query.all()
                result = {}
                
                for config in configs:
                    # 反序列化值
                    if config.config_type == "json":
                        value = json.loads(config.config_value)
                    elif config.config_type == "boolean":
                        value = config.config_value.lower() in ("true", "1", "yes")
                    elif config.config_type == "number":
                        try:
                            if "." in config.config_value:
                                value = float(config.config_value)
                            else:
                                value = int(config.config_value)
                        except ValueError:
                            value = config.config_value
                    else:
                        value = config.config_value
                    
                    result[config.config_key] = value
                
                return result
                
        except Exception as e:
            logging.info(f"❌ 获取所有配置失败: {e}")
            return {}
    
    @staticmethod
    def get_configs_by_prefix(prefix: str) -> Dict[str, Any]:
        """根据前缀获取配置"""
        try:
            with get_db_session() as session:
                configs = session.query(SystemConfig).filter(
                    SystemConfig.config_key.like(f"{prefix}%")
                ).all()
                
                result = {}
                for config in configs:
                    # 反序列化值
                    if config.config_type == "json":
                        value = json.loads(config.config_value)
                    elif config.config_type == "boolean":
                        value = config.config_value.lower() in ("true", "1", "yes")
                    elif config.config_type == "number":
                        try:
                            if "." in config.config_value:
                                value = float(config.config_value)
                            else:
                                value = int(config.config_value)
                        except ValueError:
                            value = config.config_value
                    else:
                        value = config.config_value
                    
                    result[config.config_key] = value
                
                return result
                
        except Exception as e:
            logging.info(f"❌ 根据前缀获取配置失败: {e}")
            return {}
    
    @staticmethod
    def init_default_configs():
        """初始化默认配置"""
        default_configs = [
            {
                "key": "system.version",
                "value": "1.0.0",
                "type": "string",
                "description": "系统版本号",
                "is_system": True
            },
            {
                "key": "cache.default_ttl",
                "value": 3600,
                "type": "number",
                "description": "默认缓存过期时间（秒）",
                "is_system": False
            },
            {
                "key": "transcription.max_concurrent",
                "value": 3,
                "type": "number",
                "description": "最大并发转录任务数",
                "is_system": False
            },
            {
                "key": "file.max_upload_size",
                "value": 1073741824,  # 1GB
                "type": "number",
                "description": "最大上传文件大小（字节）",
                "is_system": False
            },
            {
                "key": "cleanup.auto_enabled",
                "value": True,
                "type": "boolean",
                "description": "是否启用自动清理",
                "is_system": False
            }
        ]
        
        for config in default_configs:
            ConfigDAO.set_config(
                config["key"],
                config["value"],
                config["type"],
                config["description"],
                config["is_system"]
            )
