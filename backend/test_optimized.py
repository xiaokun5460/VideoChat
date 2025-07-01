"""
VideoChat 优化功能测试脚本

测试转录服务集成和任务取消功能
"""

import requests
import time
import io


def test_transcription_integration():
    """测试转录服务集成"""
    print("🧪 测试转录服务集成...")
    
    # 1. 上传文件
    test_file = io.BytesIO(b'test audio content for transcription')
    upload_response = requests.post(
        'http://localhost:8001/api/files/upload',
        files={'file': ('test_audio.mp3', test_file, 'audio/mpeg')},
        data={'description': '转录测试文件'}
    )
    
    if upload_response.status_code != 200:
        print("❌ 文件上传失败")
        return
    
    file_id = upload_response.json()['data']['id']
    print(f"✅ 文件上传成功: {file_id}")
    
    # 2. 创建转录任务
    task_response = requests.post(
        'http://localhost:8001/api/tasks/',
        json={
            'task_type': 'transcription',
            'file_id': file_id,
            'parameters': {'language': 'auto'}
        }
    )
    
    if task_response.status_code != 200:
        print("❌ 任务创建失败")
        return
    
    task_id = task_response.json()['data']['task_id']
    print(f"✅ 转录任务创建成功: {task_id}")
    
    # 3. 等待任务进行一段时间
    print("⏳ 等待任务执行...")
    time.sleep(5)
    
    # 4. 检查任务状态
    status_response = requests.get(f'http://localhost:8001/api/tasks/{task_id}')
    if status_response.status_code == 200:
        task_data = status_response.json()['data']
        print(f"📊 任务状态: {task_data['status']}")
        print(f"📊 任务进度: {task_data['progress']}%")
        print(f"📊 当前步骤: {task_data['current_step']}")
        
        # 检查是否有转录ID
        transcription_id = task_data.get('metadata', {}).get('transcription_id')
        if transcription_id:
            print(f"✅ 转录ID已关联: {transcription_id}")
            
            # 5. 检查转录结果
            transcription_response = requests.get(f'http://localhost:8001/api/transcriptions/task/{task_id}')
            if transcription_response.status_code == 200:
                print("✅ 转录结果查询成功")
            else:
                print("⚠️ 转录结果查询失败，可能还在处理中")
        else:
            print("⚠️ 转录ID未关联")
    
    # 6. 清理测试数据
    requests.delete(f'http://localhost:8001/api/files/{file_id}')
    print("🧹 测试数据已清理")


def test_task_cancellation():
    """测试任务取消功能"""
    print("\n🧪 测试任务取消功能...")
    
    # 1. 上传文件
    test_file = io.BytesIO(b'test audio content for cancellation test')
    upload_response = requests.post(
        'http://localhost:8001/api/files/upload',
        files={'file': ('cancel_test.mp3', test_file, 'audio/mpeg')},
        data={'description': '取消测试文件'}
    )
    
    if upload_response.status_code != 200:
        print("❌ 文件上传失败")
        return
    
    file_id = upload_response.json()['data']['id']
    print(f"✅ 文件上传成功: {file_id}")
    
    # 2. 创建转录任务
    task_response = requests.post(
        'http://localhost:8001/api/tasks/',
        json={
            'task_type': 'transcription',
            'file_id': file_id,
            'parameters': {'language': 'auto'}
        }
    )
    
    if task_response.status_code != 200:
        print("❌ 任务创建失败")
        return
    
    task_id = task_response.json()['data']['task_id']
    print(f"✅ 转录任务创建成功: {task_id}")
    
    # 3. 等待任务开始执行
    print("⏳ 等待任务开始执行...")
    time.sleep(3)
    
    # 4. 尝试取消任务
    print("🛑 尝试取消任务...")
    cancel_response = requests.post(f'http://localhost:8001/api/tasks/{task_id}/cancel')
    
    if cancel_response.status_code == 200:
        cancel_data = cancel_response.json()
        if cancel_data['success']:
            print("✅ 任务取消成功")
        else:
            print(f"⚠️ 任务取消失败: {cancel_data['message']}")
    else:
        print("❌ 任务取消请求失败")
    
    # 5. 检查任务最终状态
    time.sleep(2)
    status_response = requests.get(f'http://localhost:8001/api/tasks/{task_id}')
    if status_response.status_code == 200:
        task_data = status_response.json()['data']
        print(f"📊 最终任务状态: {task_data['status']}")
        print(f"📊 最终进度: {task_data['progress']}%")
    
    # 6. 清理测试数据
    requests.delete(f'http://localhost:8001/api/files/{file_id}')
    print("🧹 测试数据已清理")


def test_ai_services():
    """测试AI服务功能"""
    print("\n🧪 测试AI服务功能...")
    
    test_text = "这是一个关于人工智能技术发展的测试文本。人工智能正在改变我们的生活方式，从智能手机到自动驾驶汽车，AI技术无处不在。"
    
    # 测试AI总结
    print("📝 测试AI总结...")
    summary_response = requests.post(
        'http://localhost:8001/api/ai/summary',
        json={'text': test_text, 'stream': False}
    )
    
    if summary_response.status_code == 200:
        summary_data = summary_response.json()
        if summary_data['success']:
            print("✅ AI总结成功")
            print(f"📄 总结内容: {summary_data['data']['summary'][:100]}...")
        else:
            print(f"❌ AI总结失败: {summary_data['message']}")
    else:
        print("❌ AI总结请求失败")
    
    # 测试AI对话
    print("💬 测试AI对话...")
    chat_response = requests.post(
        'http://localhost:8001/api/ai/chat',
        json={
            'messages': [
                {'role': 'user', 'content': '请简单介绍一下VideoChat系统的功能'}
            ],
            'context': test_text,
            'stream': False
        }
    )
    
    if chat_response.status_code == 200:
        chat_data = chat_response.json()
        if chat_data['success']:
            print("✅ AI对话成功")
            print(f"💬 回复内容: {chat_data['data']['response'][:100]}...")
        else:
            print(f"❌ AI对话失败: {chat_data['message']}")
    else:
        print("❌ AI对话请求失败")


def main():
    """主函数"""
    print("🚀 VideoChat 优化功能测试")
    print("=" * 50)
    
    # 检查服务是否运行
    try:
        health_response = requests.get("http://localhost:8001/api/system/health", timeout=5)
        if health_response.status_code != 200:
            print("❌ 服务未运行或不可访问")
            return
        
        health_data = health_response.json()
        print(f"✅ 服务运行正常，状态: {health_data['data']['status']}")
        
    except Exception as e:
        print(f"❌ 无法连接到服务: {e}")
        print("请确保VideoChat服务正在运行: uvicorn app:app --host 0.0.0.0 --port 8001")
        return
    
    # 运行测试
    test_transcription_integration()
    test_task_cancellation()
    test_ai_services()
    
    print("\n🎉 优化功能测试完成！")


if __name__ == "__main__":
    main()
