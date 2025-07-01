/**
 * 导出功能组合式函数
 * 处理转录内容和AI结果的多格式导出功能
 */

import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import type { TranscriptionSegment, ExportOptions, ExportFormat } from '@/types'

export const useExport = () => {
  const message = useMessage()
  
  // 响应式状态
  const isExporting = ref(false)
  const exportProgress = ref(0)
  const exportError = ref<string | null>(null)
  
  // 计算属性
  const canExport = computed(() => !isExporting.value)
  const hasError = computed(() => exportError.value !== null)
  
  /**
   * 导出转录内容
   */
  const exportTranscription = async (
    segments: TranscriptionSegment[],
    format: ExportFormat,
    options: ExportOptions = {
      format,
      includeTimestamps: true,
      includeSpeakers: true,
      includeConfidence: false
    }
  ) => {
    if (!segments || segments.length === 0) {
      message.warning('没有转录内容可以导出')
      return
    }
    
    try {
      isExporting.value = true
      exportError.value = null
      exportProgress.value = 0
      
      // 准备导出数据
      const exportData = segments.map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        ...(options.includeSpeakers && segment.speaker && { speaker: segment.speaker }),
        ...(options.includeConfidence && segment.confidence && { confidence: segment.confidence })
      }))
      
      exportProgress.value = 30
      
      // 发起导出请求
      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      })
      
      exportProgress.value = 60
      
      if (!response.ok) {
        throw new Error(`导出失败: ${response.status}`)
      }
      
      // 获取文件内容
      const blob = await response.blob()
      exportProgress.value = 90
      
      // 下载文件
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = generateFilename(format)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      exportProgress.value = 100
      message.success(`${format.toUpperCase()}文件导出成功`)
      
    } catch (error: any) {
      exportError.value = error.message || '导出失败'
      message.error('导出失败')
      console.error('导出错误:', error)
    } finally {
      isExporting.value = false
      setTimeout(() => {
        exportProgress.value = 0
      }, 2000)
    }
  }
  
  /**
   * 导出AI总结内容
   */
  const exportSummary = async (content: string, title: string = '智能总结') => {
    if (!content) {
      message.warning('没有总结内容可以导出')
      return
    }
    
    try {
      isExporting.value = true
      exportError.value = null
      
      // 格式化Markdown内容
      const markdownContent = `# ${title}\n\n${content}\n\n---\n\n*导出时间: ${new Date().toLocaleString('zh-CN')}*`
      
      // 发起导出请求
      const response = await fetch('/api/export/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(markdownContent),
      })
      
      if (!response.ok) {
        throw new Error(`导出失败: ${response.status}`)
      }
      
      // 下载文件
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title}_${generateTimestamp()}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      message.success('总结文件导出成功')
      
    } catch (error: any) {
      exportError.value = error.message || '导出失败'
      message.error('导出总结失败')
      console.error('导出总结错误:', error)
    } finally {
      isExporting.value = false
    }
  }
  
  /**
   * 导出AI内容为图片
   */
  const exportContentAsImage = async (
    content: string,
    title: string,
    contentType: 'summary' | 'evaluation' | 'mindmap'
  ) => {
    if (!content) {
      message.warning('没有内容可以导出')
      return
    }
    
    try {
      isExporting.value = true
      exportError.value = null
      
      // 发起图片导出请求
      const response = await fetch('/api/ai/export-content-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          title,
          content_type: contentType
        }),
      })
      
      if (!response.ok) {
        throw new Error(`导出失败: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.image_path) {
        // 下载图片
        const imageResponse = await fetch(result.image_path)
        const blob = await imageResponse.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${title}_${generateTimestamp()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        message.success('图片导出成功')
      } else {
        throw new Error('未获取到图片路径')
      }
      
    } catch (error: any) {
      exportError.value = error.message || '导出失败'
      message.error('图片导出失败')
      console.error('图片导出错误:', error)
    } finally {
      isExporting.value = false
    }
  }
  
  /**
   * 批量导出多种格式
   */
  const batchExport = async (
    segments: TranscriptionSegment[],
    formats: ExportFormat[],
    options: ExportOptions
  ) => {
    if (!segments || segments.length === 0) {
      message.warning('没有转录内容可以导出')
      return
    }
    
    try {
      isExporting.value = true
      exportError.value = null
      
      const totalFormats = formats.length
      let completedFormats = 0
      
      for (const format of formats) {
        await exportTranscription(segments, format, { ...options, format })
        completedFormats++
        exportProgress.value = (completedFormats / totalFormats) * 100
      }
      
      message.success(`成功导出${totalFormats}种格式的文件`)
      
    } catch (error: any) {
      exportError.value = error.message || '批量导出失败'
      message.error('批量导出失败')
      console.error('批量导出错误:', error)
    } finally {
      isExporting.value = false
      setTimeout(() => {
        exportProgress.value = 0
      }, 2000)
    }
  }
  
  /**
   * 生成文件名
   */
  const generateFilename = (format: ExportFormat) => {
    const timestamp = generateTimestamp()
    return `transcription_${timestamp}.${format}`
  }
  
  /**
   * 生成时间戳
   */
  const generateTimestamp = () => {
    const now = new Date()
    return now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
  }
  
  /**
   * 重置导出状态
   */
  const resetExport = () => {
    isExporting.value = false
    exportProgress.value = 0
    exportError.value = null
  }
  
  return {
    // 状态
    isExporting,
    exportProgress,
    exportError,
    
    // 计算属性
    canExport,
    hasError,
    
    // 方法
    exportTranscription,
    exportSummary,
    exportContentAsImage,
    batchExport,
    resetExport,
    generateFilename,
    generateTimestamp
  }
}

// 导出类型
export type ExportComposable = ReturnType<typeof useExport>
