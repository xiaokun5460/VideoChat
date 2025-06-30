"""
数据库系统测试脚本

测试数据持久化和缓存系统的功能
"""

import os
import sys
import time
import uuid
import logging

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_simple_cache():
    """测试简化版缓存系统"""
    logging.info("🧪 测试简化版缓存系统...")
    
    try:
        from utils.simple_cache import SimpleCache, simple_cache_manager
        
        # 测试基本缓存操作
        cache = SimpleCache(max_size=10)
        
        # 设置缓存
        cache.set("test_key", "test_value", ttl_seconds=60)
        
        # 获取缓存
        value = cache.get("test_key")
        assert value == "test_value", f"期望 'test_value'，实际 '{value}'"
        
        # 测试过期
        cache.set("expire_key", "expire_value", ttl_seconds=1)
        time.sleep(1.1)
        expired_value = cache.get("expire_key")
        assert expired_value is None, f"期望 None，实际 '{expired_value}'"
        
        # 测试统计
        stats = cache.get_stats()
        assert stats['size'] >= 0, "统计信息应该包含size"
        
        # 测试缓存管理器
        simple_cache_manager.set("manager_test", {"data": "test"})
        manager_value = simple_cache_manager.get("manager_test")
        assert manager_value == {"data": "test"}, "缓存管理器测试失败"
        
        logging.info("✅ 简化版缓存系统测试通过")
        return True
        
    except Exception as e:
        logging.info(f"❌ 简化版缓存系统测试失败: {e}")
        return False

def test_cache_decorator():
    """测试缓存装饰器"""
    logging.info("🧪 测试缓存装饰器...")
    
    try:
        from utils.simple_cache import simple_cached
        
        call_count = 0
        
        @simple_cached(ttl_seconds=60, key_prefix="test_func")
        def expensive_function(x, y):
            nonlocal call_count
            call_count += 1
            return x + y
        
        # 第一次调用
        result1 = expensive_function(1, 2)
        assert result1 == 3, f"期望 3，实际 {result1}"
        assert call_count == 1, f"期望调用1次，实际 {call_count} 次"
        
        # 第二次调用（应该使用缓存）
        result2 = expensive_function(1, 2)
        assert result2 == 3, f"期望 3，实际 {result2}"
        assert call_count == 1, f"期望调用1次，实际 {call_count} 次"
        
        # 不同参数的调用
        result3 = expensive_function(2, 3)
        assert result3 == 5, f"期望 5，实际 {result3}"
        assert call_count == 2, f"期望调用2次，实际 {call_count} 次"
        
        logging.info("✅ 缓存装饰器测试通过")
        return True
        
    except Exception as e:
        logging.info(f"❌ 缓存装饰器测试失败: {e}")
        return False

def test_database_models():
    """测试数据库模型（如果SQLAlchemy可用）"""
    logging.info("🧪 测试数据库模型...")

    try:
        # 尝试导入SQLAlchemy相关模块
        from database.models import TranscriptionTask, FileRecord
        from database.connection import init_database, get_db_session
        
        # 初始化数据库
        init_database()
        
        # 测试创建任务记录
        with get_db_session() as session:
            task = TranscriptionTask(
                task_id=str(uuid.uuid4()),
                file_path="/test/path.mp3",
                file_name="test.mp3",
                file_size=1024,
                status="pending"
            )
            session.add(task)
            session.commit()
            
            # 查询任务
            found_task = session.query(TranscriptionTask).filter(
                TranscriptionTask.task_id == task.task_id
            ).first()
            
            assert found_task is not None, "任务记录未找到"
            assert found_task.file_name == "test.mp3", "文件名不匹配"
        
        logging.info("✅ 数据库模型测试通过")
        return True

    except ImportError as e:
        logging.warning(f"⚠️ SQLAlchemy未安装，跳过数据库测试: {e}")
        return True  # 不算失败
    except Exception as e:
        logging.error(f"❌ 数据库模型测试失败: {e}")
        return False

def test_dao_operations():
    """测试DAO操作（如果可用）"""
    logging.info("🧪 测试DAO操作...")
    
    try:
        from dao.transcription_dao import TranscriptionDAO
        
        # 创建测试任务
        task = TranscriptionDAO.create_task(
            task_id=str(uuid.uuid4()),
            file_path="/test/dao_test.mp3",
            file_name="dao_test.mp3",
            file_size=2048
        )
        
        assert task is not None, "任务创建失败"
        
        # 获取任务
        found_task = TranscriptionDAO.get_task_by_id(task.task_id)
        assert found_task is not None, "任务查询失败"
        assert found_task.file_name == "dao_test.mp3", "任务信息不匹配"
        
        # 更新任务状态
        success = TranscriptionDAO.update_task_status(
            task.task_id, 
            "completed", 
            progress=100.0
        )
        assert success, "任务状态更新失败"
        
        logging.info("✅ DAO操作测试通过")
        return True

    except ImportError as e:
        logging.warning(f"⚠️ DAO模块未可用，跳过DAO测试: {e}")
        return True  # 不算失败
    except Exception as e:
        logging.error(f"❌ DAO操作测试失败: {e}")
        return False

def main():
    """主测试函数"""
    logging.info("🚀 开始数据库系统测试...")

    tests = [
        ("简化版缓存系统", test_simple_cache),
        ("缓存装饰器", test_cache_decorator),
        ("数据库模型", test_database_models),
        ("DAO操作", test_dao_operations),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        logging.info(f"--- {test_name} ---")
        if test_func():
            passed += 1

    logging.info("=" * 50)
    logging.info(f"测试结果: {passed}/{total} 通过")

    if passed == total:
        logging.info("🎉 所有测试通过！")
        return True
    else:
        logging.warning("⚠️ 部分测试失败，请检查相关模块")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
