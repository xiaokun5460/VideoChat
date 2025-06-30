/**
 * 主题选择器组件
 * 提供主题切换功能的UI组件
 */

import React from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import { 
  SunOutlined, 
  MoonOutlined, 
  DesktopOutlined,
  BgColorsOutlined 
} from '@ant-design/icons';
import { useTheme, THEME_MODES } from '../../hooks/useTheme';

/**
 * 获取主题图标组件
 * @param {string} mode - 主题模式
 * @returns {React.ReactElement} 图标组件
 */
const getThemeIcon = (mode) => {
  const iconMap = {
    [THEME_MODES.LIGHT]: SunOutlined,
    [THEME_MODES.DARK]: MoonOutlined,
    [THEME_MODES.SYSTEM]: DesktopOutlined
  };
  
  const IconComponent = iconMap[mode] || SunOutlined;
  return <IconComponent />;
};

/**
 * 主题选择器组件
 * @param {Object} props - 组件属性
 * @param {string} props.type - 按钮类型：'button' | 'icon' | 'dropdown'
 * @param {string} props.size - 按钮大小
 * @param {boolean} props.showLabel - 是否显示文字标签
 */
const ThemeSelector = ({ 
  type = 'dropdown', 
  size = 'middle',
  showLabel = true 
}) => {
  const { 
    themeMode, 
    setTheme, 
    toggleLightDark,
    getThemeDisplayName,
    THEME_MODES 
  } = useTheme();

  // 下拉菜单项
  const menuItems = Object.values(THEME_MODES).map(mode => ({
    key: mode,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {getThemeIcon(mode)}
        <span>{getThemeDisplayName(mode)}</span>
      </div>
    ),
    onClick: () => setTheme(mode)
  }));

  // 根据类型渲染不同的组件
  switch (type) {
    case 'icon':
      // 简单的图标按钮，点击切换亮色/暗色
      return (
        <Tooltip title={`切换到${getThemeDisplayName(themeMode === THEME_MODES.LIGHT ? THEME_MODES.DARK : THEME_MODES.LIGHT)}`}>
          <Button
            type="text"
            icon={getThemeIcon(themeMode)}
            onClick={toggleLightDark}
            size={size}
          />
        </Tooltip>
      );

    case 'button':
      // 带文字的按钮
      return (
        <Button
          icon={getThemeIcon(themeMode)}
          onClick={toggleLightDark}
          size={size}
        >
          {showLabel && getThemeDisplayName(themeMode)}
        </Button>
      );

    case 'dropdown':
    default:
      // 下拉选择器
      return (
        <Dropdown
          menu={{ items: menuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button
            icon={<BgColorsOutlined />}
            size={size}
          >
            {showLabel && '主题'}
          </Button>
        </Dropdown>
      );
  }
};

/**
 * 简单的主题切换按钮
 * 只在亮色和暗色之间切换
 */
export const ThemeToggle = ({ size = 'middle' }) => {
  return (
    <ThemeSelector 
      type="icon" 
      size={size} 
      showLabel={false} 
    />
  );
};

/**
 * 主题按钮
 * 显示当前主题并可以切换
 */
export const ThemeButton = ({ size = 'middle', showLabel = true }) => {
  return (
    <ThemeSelector 
      type="button" 
      size={size} 
      showLabel={showLabel} 
    />
  );
};

/**
 * 主题下拉选择器
 * 提供所有主题选项
 */
export const ThemeDropdown = ({ size = 'middle', showLabel = true }) => {
  return (
    <ThemeSelector 
      type="dropdown" 
      size={size} 
      showLabel={showLabel} 
    />
  );
};

export default ThemeSelector;
