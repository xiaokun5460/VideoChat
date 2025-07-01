/**
 * 测试完整的上传→转录→显示流程
 */

const API_BASE_URL = 'http://localhost:8000/api'

// 创建一个真实的音频文件（简单的WAV格式）
function createTestAudioFile() {
  // 创建一个简单的WAV文件头
  const sampleRate = 44100
  const duration = 1 // 1秒
  const numChannels = 1
  const bitsPerSample = 16
  const numSamples = sampleRate * duration

  // WAV文件头（44字节）
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  // RIFF header
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true) // file size
  view.setUint32(8, 0x57415645, false) // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // audio format (PCM)
  view.setUint16(22, numChannels, true) // num channels
  view.setUint32(24, sampleRate, true) // sample rate
  view.setUint32(28, (sampleRate * numChannels * bitsPerSample) / 8, true) // byte rate
  view.setUint16(32, (numChannels * bitsPerSample) / 8, true) // block align
  view.setUint16(34, bitsPerSample, true) // bits per sample

  // data chunk
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, numSamples * 2, true) // data size

  // 创建音频数据（简单的正弦波）
  const audioData = new ArrayBuffer(numSamples * 2)
  const audioView = new DataView(audioData)

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5 // 440Hz正弦波
    const intSample = Math.round(sample * 32767)
    audioView.setInt16(i * 2, intSample, true)
  }

  // 合并头部和数据
  const fullFile = new Uint8Array(header.byteLength + audioData.byteLength)
  fullFile.set(new Uint8Array(header), 0)
  fullFile.set(new Uint8Array(audioData), header.byteLength)

  // 使用随机文件名避免数据库约束冲突
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substr(2, 9)
  const fileName = `test-audio-${timestamp}-${randomId}.wav`

  return new File([fullFile], fileName, { type: 'audio/wav' })
}

// 测试上传和转录流程
async function testUploadAndTranscriptionFlow() {
  console.log('🚀 开始测试完整的上传→转录→显示流程...\n')

  try {
    // 1. 创建测试音频文件
    console.log('📁 创建测试音频文件...')
    const testFile = createTestAudioFile()
    console.log(`   文件名: ${testFile.name}`)
    console.log(`   文件大小: ${testFile.size} bytes`)
    console.log(`   文件类型: ${testFile.type}`)

    // 2. 上传文件
    console.log('\n📤 开始上传文件...')
    const formData = new FormData()
    formData.append('file', testFile)

    const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    })

    console.log(`   上传状态码: ${uploadResponse.status}`)

    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json()
      console.log(`   ✅ 上传成功:`, uploadData)

      // 3. 检查是否有任务ID
      if (uploadData.task_id) {
        console.log(`\n🎯 获得任务ID: ${uploadData.task_id}`)

        // 4. 监控任务进度
        console.log('\n📊 开始监控任务进度...')
        await monitorTaskProgress(uploadData.task_id)
      } else if (uploadData.transcription && uploadData.transcription.length > 0) {
        console.log('\n✅ 转录已完成！')
        console.log('   转录结果:', uploadData.transcription)
      }

      // 5. 检查活跃任务
      console.log('\n🔍 检查活跃任务...')
      await checkActiveTasks()
    } else {
      const errorText = await uploadResponse.text()
      console.log(`   ❌ 上传失败: ${errorText}`)
    }
  } catch (error) {
    console.log(`❌ 测试过程中发生错误: ${error.message}`)
  }
}

// 监控任务进度
async function monitorTaskProgress(taskId) {
  const maxAttempts = 30 // 最多检查30次
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${API_BASE_URL}/progress/${taskId}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const task = data.data
          console.log(`   进度更新 ${attempts + 1}: ${task.progress}% - ${task.current_step}`)

          if (task.status === 'completed') {
            console.log('   🎉 任务完成！')
            break
          } else if (task.status === 'failed') {
            console.log('   ❌ 任务失败:', task.error_message)
            break
          }
        }
      } else {
        console.log(`   ⚠️ 获取进度失败: ${response.status}`)
      }

      attempts++
      await new Promise((resolve) => setTimeout(resolve, 2000)) // 等待2秒
    } catch (error) {
      console.log(`   ❌ 监控错误: ${error.message}`)
      break
    }
  }

  if (attempts >= maxAttempts) {
    console.log('   ⏰ 监控超时')
  }
}

// 检查活跃任务
async function checkActiveTasks() {
  try {
    const response = await fetch(`${API_BASE_URL}/progress/active`)
    const data = await response.json()

    if (data.success) {
      const tasks = data.data.tasks || []
      console.log(`   📋 当前活跃任务数: ${tasks.length}`)

      tasks.forEach((task, index) => {
        console.log(`   任务 ${index + 1}:`)
        console.log(`     ID: ${task.task_id}`)
        console.log(`     类型: ${task.task_type}`)
        console.log(`     状态: ${task.status}`)
        console.log(`     进度: ${task.progress}%`)
        console.log(`     文件: ${task.file_name}`)
      })
    } else {
      console.log(`   ❌ 获取活跃任务失败: ${data.message}`)
    }
  } catch (error) {
    console.log(`   ❌ 检查活跃任务错误: ${error.message}`)
  }
}

// 运行测试
testUploadAndTranscriptionFlow()
  .then(() => {
    console.log('\n✅ 测试完成！')
    console.log('\n💡 测试总结：')
    console.log('   - 如果看到任务ID和进度更新，说明任务跟踪系统正常')
    console.log('   - 如果转录完成，说明整个流程正常工作')
    console.log('   - 前端应该能在全局任务管理器中看到这些任务')
  })
  .catch(console.error)
