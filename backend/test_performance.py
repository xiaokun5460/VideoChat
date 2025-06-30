"""
性能优化系统测试脚本

测试任务队列、资源监控和流式优化功能
"""

import asyncio
import os
import sys
import time
import logging

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


async def test_task_queue():
    """测试任务队列"""
    logging.info("🧪 测试任务队列...")

    try:
        from utils.task_queue import TaskQueue, TaskPriority
        
        # 创建任务队列
        queue = TaskQueue(max_workers=2, max_queue_size=10)
        await queue.start()
        
        # 测试函数
        async def test_task(x, y):
            await asyncio.sleep(0.1)  # 模拟工作
            return x + y
        
        # 提交任务
        task_id1 = await queue.submit_task(test_task, 1, 2, priority=TaskPriority.HIGH)
        task_id2 = await queue.submit_task(test_task, 3, 4, priority=TaskPriority.NORMAL)
        
        # 等待任务完成
        await asyncio.sleep(0.5)
        
        # 检查任务状态
        status1 = queue.get_task_status(task_id1)
        status2 = queue.get_task_status(task_id2)
        
        assert status1 is not None, "任务1状态不应为空"
        assert status2 is not None, "任务2状态不应为空"
        
        # 获取统计信息
        stats = queue.get_queue_stats()
        assert stats["total_tasks"] >= 2, "总任务数应该至少为2"
        
        await queue.stop()
        
        logging.info("✅ 任务队列测试通过")
        return True

    except Exception as e:
        logging.error(f"❌ 任务队列测试失败: {e}")
        return False


async def test_resource_monitor():
    """测试资源监控"""
    logging.info("🧪 测试资源监控...")
    
    try:
        from utils.resource_monitor import ResourceMonitor
        
        # 创建资源监控器
        monitor = ResourceMonitor(history_size=10, sample_interval=0.1)
        
        # 启动监控
        await monitor.start_monitoring()
        
        # 等待收集一些数据
        await asyncio.sleep(0.5)
        
        # 获取当前状态
        current_status = monitor.get_current_status()
        assert current_status is not None, "当前状态不应为空"
        assert current_status.cpu_percent >= 0, "CPU使用率应该大于等于0"
        assert current_status.memory_percent >= 0, "内存使用率应该大于等于0"
        
        # 获取统计信息
        stats = monitor.get_statistics(minutes=1)
        assert "cpu" in stats, "统计信息应包含CPU数据"
        assert "memory" in stats, "统计信息应包含内存数据"
        
        # 测试阈值设置
        monitor.set_thresholds(cpu_warning=50.0, memory_warning=50.0)
        
        await monitor.stop_monitoring()
        
        logging.info("✅ 资源监控测试通过")
        return True

    except Exception as e:
        logging.error(f"❌ 资源监控测试失败: {e}")
        return False


async def test_streaming_optimizer():
    """测试流式优化器"""
    logging.info("🧪 测试流式优化器...")
    
    try:
        from utils.streaming_optimizer import StreamingOptimizer
        
        optimizer = StreamingOptimizer(buffer_size=100, flush_interval=0.1)
        
        # 测试数据生成器
        async def test_data_generator():
            for i in range(5):
                yield f"chunk_{i} "
                await asyncio.sleep(0.01)
        
        # 测试缓冲流
        chunks = []
        async for chunk in optimizer.stream_with_buffer(test_data_generator()):
            chunks.append(chunk)
        
        assert len(chunks) > 0, "应该产生至少一个数据块"
        combined = ''.join(chunks)
        assert "chunk_0" in combined, "应该包含第一个数据块"
        assert "chunk_4" in combined, "应该包含最后一个数据块"
        
        # 测试JSON流
        async def test_json_generator():
            for i in range(3):
                yield {"index": i, "data": f"test_{i}"}
                await asyncio.sleep(0.01)
        
        json_chunks = []
        async for chunk in optimizer.stream_json_chunks(test_json_generator()):
            json_chunks.append(chunk)
        
        assert len(json_chunks) >= 3, "应该产生至少3个JSON数据块"
        
        logging.info("✅ 流式优化器测试通过")
        return True

    except Exception as e:
        logging.error(f"❌ 流式优化器测试失败: {e}")
        return False


async def test_performance_stt_service():
    """测试高性能转录服务"""
    logging.info("🧪 测试高性能转录服务...")
    
    try:
        from services.performance_stt_service import PerformanceSTTService
        
        service = PerformanceSTTService()
        
        # 测试初始化
        await service.initialize()
        
        # 获取服务统计
        stats = service.get_service_stats()
        assert "service_stats" in stats, "统计信息应包含服务统计"
        assert "queue_stats" in stats, "统计信息应包含队列统计"
        
        # 测试性能优化
        await service.optimize_performance()
        
        # 关闭服务
        await service.shutdown()
        
        logging.info("✅ 高性能转录服务测试通过")
        return True

    except Exception as e:
        logging.error(f"❌ 高性能转录服务测试失败: {e}")
        return False


async def test_simple_cache_performance():
    """测试缓存性能"""
    logging.info("🧪 测试缓存性能...")
    
    try:
        from utils.simple_cache import SimpleCache
        
        cache = SimpleCache(max_size=1000)
        
        # 性能测试
        start_time = time.time()
        
        # 写入测试
        for i in range(100):
            cache.set(f"key_{i}", f"value_{i}")
        
        write_time = time.time() - start_time
        
        # 读取测试
        start_time = time.time()
        hits = 0
        for i in range(100):
            if cache.get(f"key_{i}") is not None:
                hits += 1
        
        read_time = time.time() - start_time
        
        assert hits == 100, f"应该命中100次，实际命中{hits}次"
        assert write_time < 1.0, f"写入时间过长: {write_time:.3f}s"
        assert read_time < 1.0, f"读取时间过长: {read_time:.3f}s"
        
        # 获取统计
        stats = cache.get_stats()
        assert stats["size"] == 100, f"缓存大小应为100，实际为{stats['size']}"
        
        logging.info(f"✅ 缓存性能测试通过 (写入: {write_time:.3f}s, 读取: {read_time:.3f}s)")
        return True

    except Exception as e:
        logging.error(f"❌ 缓存性能测试失败: {e}")
        return False


async def main():
    """主测试函数"""
    logging.info("🚀 开始性能优化系统测试...")
    
    tests = [
        ("任务队列", test_task_queue),
        ("资源监控", test_resource_monitor),
        ("流式优化器", test_streaming_optimizer),
        ("高性能转录服务", test_performance_stt_service),
        ("缓存性能", test_simple_cache_performance),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        logging.info(f"--- {test_name} ---")
        try:
            if await test_func():
                passed += 1
        except Exception as e:
            logging.error(f"❌ {test_name} 测试异常: {e}")

    logging.info("=" * 50)
    logging.info(f"测试结果: {passed}/{total} 通过")

    if passed == total:
        logging.info("🎉 所有性能优化测试通过！")
        return True
    else:
        logging.warning("⚠️ 部分测试失败，请检查相关模块")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
