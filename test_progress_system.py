#!/usr/bin/env python3
"""
进度反馈和分片上传系统综合测试

测试所有新增功能的完整性和性能表现
"""

import asyncio
import hashlib
import logging
import os
import sys
import tempfile
import time
from pathlib import Path

# 添加项目路径
sys.path.append(str(Path(__file__).parent / "backend"))

from utils.progress_manager import progress_manager, TaskType, TaskStatus
from utils.chunked_upload import chunked_upload_manager
from utils.transcription_progress import transcription_tracker

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def create_test_file(size_mb: int = 5) -> str:
    """创建测试文件"""
    test_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
    test_data = b'0' * (size_mb * 1024 * 1024)  # 创建指定大小的文件
    test_file.write(test_data)
    test_file.close()
    return test_file.name


async def test_progress_manager():
    """测试进度管理器"""
    logger.info("🧪 测试进度管理器...")
    
    # 创建不同类型的任务
    tasks = []
    for task_type in [TaskType.UPLOAD, TaskType.TRANSCRIPTION, TaskType.AI_PROCESSING]:
        task_id = progress_manager.create_task(
            task_type=task_type,
            file_name=f"test_{task_type.value}.mp4",
            file_size=1024 * 1024,
            total_steps=5
        )
        tasks.append(task_id)
        logger.info(f"✅ 创建 {task_type.value} 任务: {task_id}")
    
    # 模拟进度更新
    for i, task_id in enumerate(tasks):
        for progress in [20, 40, 60, 80, 100]:
            progress_manager.update_progress(
                task_id=task_id,
                progress=progress,
                status=TaskStatus.PROCESSING if progress < 100 else TaskStatus.COMPLETED,
                current_step=f"步骤 {progress//20}",
                speed=f"{10 + i} MB/s",
                eta=f"{(100-progress)*2}s"
            )
            await asyncio.sleep(0.1)  # 模拟处理时间
        
        # 完成任务
        progress_manager.complete_task(task_id, success=True)
        logger.info(f"✅ 完成任务: {task_id}")
    
    # 获取统计信息
    stats = progress_manager.get_stats()
    logger.info(f"📊 进度管理器统计: {stats}")
    
    # 获取活跃任务
    active_tasks = progress_manager.get_active_tasks()
    logger.info(f"📋 活跃任务数: {len(active_tasks)}")
    
    return True


async def test_chunked_upload():
    """测试分片上传"""
    logger.info("🧪 测试分片上传...")
    
    # 创建测试文件
    test_file_path = create_test_file(5)  # 5MB测试文件
    file_size = os.path.getsize(test_file_path)
    file_name = "test_upload.mp4"
    
    # 计算文件哈希
    with open(test_file_path, 'rb') as f:
        file_hash = hashlib.md5(f.read()).hexdigest()
    
    try:
        # 创建上传会话
        session_id = await chunked_upload_manager.create_upload_session(
            file_name=file_name,
            file_size=file_size,
            file_hash=file_hash,
            chunk_size=1024 * 1024  # 1MB分片
        )
        logger.info(f"✅ 创建上传会话: {session_id}")
        
        # 模拟分片上传
        chunk_size = 1024 * 1024
        total_chunks = (file_size + chunk_size - 1) // chunk_size
        
        with open(test_file_path, 'rb') as f:
            for chunk_id in range(total_chunks):
                chunk_data = f.read(chunk_size)
                if not chunk_data:
                    break
                
                success = await chunked_upload_manager.upload_chunk(
                    session_id=session_id,
                    chunk_id=chunk_id,
                    chunk_data=chunk_data
                )
                
                if success:
                    logger.info(f"✅ 上传分片 {chunk_id + 1}/{total_chunks}")
                else:
                    logger.error(f"❌ 上传分片 {chunk_id} 失败")
                    return False
                
                await asyncio.sleep(0.1)  # 模拟网络延迟
        
        # 检查上传状态
        status = await chunked_upload_manager.get_upload_status(session_id)
        logger.info(f"📊 上传状态: {status['progress']:.1f}% 完成")
        
        if status['completed']:
            logger.info("✅ 分片上传测试成功")
            return True
        else:
            logger.error("❌ 分片上传未完成")
            return False
            
    finally:
        # 清理测试文件
        if os.path.exists(test_file_path):
            os.unlink(test_file_path)


async def test_transcription_progress():
    """测试转录进度跟踪"""
    logger.info("🧪 测试转录进度跟踪...")
    
    file_path = "test_audio.mp3"
    file_name = "test_audio.mp3"
    
    # 开始转录跟踪
    task_id = await transcription_tracker.start_transcription_tracking(
        file_path=file_path,
        file_name=file_name,
        estimated_duration=120.0
    )
    logger.info(f"✅ 开始转录跟踪: {task_id}")
    
    # 模拟转录过程
    await transcription_tracker.update_model_loading(file_path, "Whisper-small")
    await asyncio.sleep(0.5)
    
    # 模拟转录进度
    for i in range(0, 101, 20):
        await transcription_tracker.update_transcription_progress(
            file_path=file_path,
            progress_percent=i,
            current_segment=f"这是第 {i//20 + 1} 段转录内容...",
            segments_processed=i//20,
            total_segments=5
        )
        await asyncio.sleep(0.3)
    
    # 后处理
    await transcription_tracker.update_post_processing(file_path, "文本清理")
    await asyncio.sleep(0.2)
    
    # 完成转录
    await transcription_tracker.complete_transcription(
        file_path=file_path,
        success=True,
        result_text="这是一段测试转录文本内容。",
        segments_count=5
    )
    
    logger.info("✅ 转录进度跟踪测试成功")
    return True


async def test_integration():
    """集成测试"""
    logger.info("🧪 集成测试...")
    
    # 创建测试文件
    test_file_path = create_test_file(2)  # 2MB测试文件
    file_size = os.path.getsize(test_file_path)
    file_name = "integration_test.mp4"
    
    # 计算文件哈希
    with open(test_file_path, 'rb') as f:
        file_hash = hashlib.md5(f.read()).hexdigest()
    
    try:
        # 1. 分片上传
        session_id = await chunked_upload_manager.create_upload_session(
            file_name=file_name,
            file_size=file_size,
            file_hash=file_hash
        )
        
        # 上传所有分片
        chunk_size = 512 * 1024  # 512KB分片
        total_chunks = (file_size + chunk_size - 1) // chunk_size
        
        with open(test_file_path, 'rb') as f:
            for chunk_id in range(total_chunks):
                chunk_data = f.read(chunk_size)
                if chunk_data:
                    await chunked_upload_manager.upload_chunk(
                        session_id=session_id,
                        chunk_id=chunk_id,
                        chunk_data=chunk_data
                    )
        
        # 2. 检查上传完成
        status = await chunked_upload_manager.get_upload_status(session_id)
        if not status['completed']:
            logger.error("❌ 集成测试：上传未完成")
            return False
        
        # 3. 模拟转录
        uploaded_file_path = status['task_info']['result_metadata']['file_path']
        transcription_task_id = await transcription_tracker.start_transcription_tracking(
            file_path=uploaded_file_path,
            file_name=file_name
        )
        
        # 快速完成转录
        await transcription_tracker.update_model_loading(uploaded_file_path, "Whisper")
        await transcription_tracker.update_transcription_progress(uploaded_file_path, 100.0)
        await transcription_tracker.complete_transcription(
            file_path=uploaded_file_path,
            success=True,
            result_text="集成测试转录结果",
            segments_count=1
        )
        
        logger.info("✅ 集成测试成功")
        return True
        
    finally:
        # 清理测试文件
        if os.path.exists(test_file_path):
            os.unlink(test_file_path)


async def test_performance():
    """性能测试"""
    logger.info("🧪 性能测试...")
    
    start_time = time.time()
    
    # 并发创建多个任务
    tasks = []
    for i in range(50):
        task_id = progress_manager.create_task(
            task_type=TaskType.UPLOAD,
            file_name=f"perf_test_{i}.mp4",
            file_size=1024 * 1024
        )
        tasks.append(task_id)
    
    # 并发更新进度
    async def update_task_progress(task_id, task_index):
        for progress in range(0, 101, 10):
            progress_manager.update_progress(
                task_id=task_id,
                progress=progress,
                current_step=f"任务 {task_index} 进度 {progress}%"
            )
            await asyncio.sleep(0.01)
        progress_manager.complete_task(task_id, success=True)
    
    # 并发执行
    await asyncio.gather(*[
        update_task_progress(task_id, i) 
        for i, task_id in enumerate(tasks)
    ])
    
    end_time = time.time()
    duration = end_time - start_time
    
    logger.info(f"✅ 性能测试完成: {len(tasks)} 个任务，耗时 {duration:.2f}s")
    logger.info(f"📊 平均每个任务: {duration/len(tasks)*1000:.2f}ms")
    
    return True


async def main():
    """主测试函数"""
    logger.info("🚀 开始进度反馈和分片上传系统综合测试")
    
    tests = [
        ("进度管理器", test_progress_manager),
        ("分片上传", test_chunked_upload),
        ("转录进度跟踪", test_transcription_progress),
        ("集成测试", test_integration),
        ("性能测试", test_performance)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            logger.info(f"\n{'='*50}")
            logger.info(f"🧪 开始测试: {test_name}")
            
            result = await test_func()
            
            if result:
                logger.info(f"✅ {test_name} 测试通过")
                passed += 1
            else:
                logger.error(f"❌ {test_name} 测试失败")
                failed += 1
                
        except Exception as e:
            logger.error(f"❌ {test_name} 测试异常: {str(e)}")
            failed += 1
    
    logger.info(f"\n{'='*50}")
    logger.info(f"🎯 测试结果汇总:")
    logger.info(f"✅ 通过: {passed} 个")
    logger.info(f"❌ 失败: {failed} 个")
    logger.info(f"📊 成功率: {passed/(passed+failed)*100:.1f}%")
    
    if failed == 0:
        logger.info("🎉 所有测试通过！系统功能完整且性能良好。")
        return True
    else:
        logger.error("⚠️ 部分测试失败，请检查系统配置。")
        return False


if __name__ == "__main__":
    # 确保uploads目录存在
    os.makedirs("uploads", exist_ok=True)
    
    # 运行测试
    success = asyncio.run(main())
    sys.exit(0 if success else 1)