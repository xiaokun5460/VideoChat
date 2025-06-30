/**
 * 现代化媒体播放器
 * 高端、友好、功能丰富的播放器界面
 */

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Card, Button, Slider, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  MutedOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  StepBackwardOutlined,
  StepForwardOutlined
} from '@ant-design/icons';
import './ModernMediaPlayer.css';

const ModernMediaPlayer = forwardRef(({
  src,
  type = 'video',
  poster,
  onTimeUpdate,
  onLoadedMetadata,
  className = ''
}, ref) => {
  const mediaRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // 格式化时间
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // 跳转到指定时间
  const seekTo = (time) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    seekTo,
    play: () => {
      if (mediaRef.current) {
        mediaRef.current.play();
        setIsPlaying(true);
      }
    },
    pause: () => {
      if (mediaRef.current) {
        mediaRef.current.pause();
        setIsPlaying(false);
      }
    },
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    isPlaying: () => isPlaying
  }));

  // 音量控制
  const handleVolumeChange = (value) => {
    const newVolume = value / 100;
    setVolume(newVolume);
    if (mediaRef.current) {
      mediaRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  // 静音切换
  const toggleMute = useCallback(() => {
    if (mediaRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      mediaRef.current.muted = newMuted;
    }
  }, [isMuted]);

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mediaRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 播放速度控制
  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
  };

  // 快进/快退
  const skipTime = useCallback((seconds) => {
    if (mediaRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      seekTo(newTime);
    }
  }, [duration, currentTime]);

  // 媒体事件处理
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleTimeUpdate = () => {
      const time = media.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handleLoadedMetadata = () => {
      const dur = media.duration;
      setDuration(dur);
      onLoadedMetadata?.(dur);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onLoadedMetadata]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10);
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          // 不处理其他按键
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay, skipTime, toggleMute]);

  const speedOptions = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: '1x', value: 1 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
  ];

  return (
    <Card className={`modern-media-player ${className}`} variant="outlined">
      <div className="media-container">
        {type === 'video' ? (
          <video
            ref={mediaRef}
            src={src}
            poster={poster}
            className="media-element"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          />
        ) : (
          <div className="audio-container">
            <audio ref={mediaRef} src={src} className="media-element" />
            <div className="audio-visualization">
              <div className="audio-icon">
                <SoundOutlined />
              </div>
              <div className="audio-waves">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`wave ${isPlaying ? 'playing' : ''}`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 控制栏 */}
        <div className={`controls-overlay ${showControls ? 'visible' : ''}`}>
          <div className="controls-container glass">
            {/* 进度条 */}
            <div className="progress-section">
              <Slider
                min={0}
                max={duration}
                value={currentTime}
                onChange={seekTo}
                tooltip={{ formatter: formatTime }}
                className="progress-slider"
              />
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="controls-section">
              <div className="left-controls">
                <Tooltip title="后退10秒 (←)">
                  <Button
                    type="text"
                    icon={<StepBackwardOutlined />}
                    onClick={() => skipTime(-10)}
                    className="control-btn"
                  />
                </Tooltip>

                <Tooltip title={isPlaying ? "暂停 (空格)" : "播放 (空格)"}>
                  <Button
                    type="text"
                    icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={togglePlay}
                    className="control-btn play-btn"
                    size="large"
                  />
                </Tooltip>

                <Tooltip title="前进10秒 (→)">
                  <Button
                    type="text"
                    icon={<StepForwardOutlined />}
                    onClick={() => skipTime(10)}
                    className="control-btn"
                  />
                </Tooltip>
              </div>

              <div className="right-controls">
                {/* 音量控制 */}
                <div className="volume-control">
                  <Tooltip title={isMuted ? "取消静音 (M)" : "静音 (M)"}>
                    <Button
                      type="text"
                      icon={isMuted ? <MutedOutlined /> : <SoundOutlined />}
                      onClick={toggleMute}
                      className="control-btn"
                    />
                  </Tooltip>
                  <Slider
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume * 100}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                  />
                </div>

                {/* 播放速度 */}
                <div className="speed-control">
                  <select
                    value={playbackRate}
                    onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                    className="speed-select"
                  >
                    {speedOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 全屏 */}
                {type === 'video' && (
                  <Tooltip title={isFullscreen ? "退出全屏 (F)" : "全屏 (F)"}>
                    <Button
                      type="text"
                      icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                      onClick={toggleFullscreen}
                      className="control-btn"
                    />
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

// 设置displayName以便调试
ModernMediaPlayer.displayName = 'ModernMediaPlayer';

export default ModernMediaPlayer;
