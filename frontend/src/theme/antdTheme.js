/**
 * Ant Design 主题配置
 * 基于设计令牌创建统一的 Ant Design 主题
 */

import { theme } from 'antd';
import { tokens } from './tokens';

/**
 * 创建 Ant Design 主题配置
 * @param {string} mode - 主题模式：'light' | 'dark'
 * @returns {Object} Ant Design 主题配置对象
 */
export const createAntdTheme = (mode = 'light') => {
  const isDark = mode === 'dark';
  
  return {
    // 算法配置
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    
    // 全局令牌
    token: {
      // 颜色配置
      colorPrimary: tokens.colors.primary[500],
      colorSuccess: tokens.colors.success[500],
      colorWarning: tokens.colors.warning[500],
      colorError: tokens.colors.error[500],
      colorInfo: tokens.colors.primary[500],
      
      // 中性色配置
      colorTextBase: isDark ? tokens.colors.gray[100] : tokens.colors.gray[900],
      colorBgBase: isDark ? tokens.colors.gray[900] : tokens.colors.white,
      colorBgContainer: isDark ? tokens.colors.gray[800] : tokens.colors.white,
      colorBgLayout: isDark ? tokens.colors.gray[900] : tokens.colors.gray[50],
      colorBgElevated: isDark ? tokens.colors.gray[800] : tokens.colors.white,
      
      // 边框配置
      colorBorder: isDark ? tokens.colors.gray[700] : tokens.colors.gray[200],
      colorBorderSecondary: isDark ? tokens.colors.gray[800] : tokens.colors.gray[100],
      
      // 字体配置
      fontFamily: tokens.typography.fontFamily.sans,
      fontSize: 14,
      fontSizeHeading1: 38,
      fontSizeHeading2: 30,
      fontSizeHeading3: 24,
      fontSizeHeading4: 20,
      fontSizeHeading5: 16,
      
      // 圆角配置
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
      borderRadiusXS: 4,
      
      // 间距配置
      padding: 16,
      paddingLG: 24,
      paddingSM: 12,
      paddingXS: 8,
      paddingXXS: 4,
      
      margin: 16,
      marginLG: 24,
      marginSM: 12,
      marginXS: 8,
      marginXXS: 4,
      
      // 阴影配置
      boxShadow: tokens.boxShadow.base,
      boxShadowSecondary: tokens.boxShadow.sm,
      boxShadowTertiary: tokens.boxShadow.lg,
      
      // 动画配置
      motionDurationFast: tokens.animation.duration[200],
      motionDurationMid: tokens.animation.duration[300],
      motionDurationSlow: tokens.animation.duration[500],
      motionEaseInOut: tokens.animation.easing.inOut,
      motionEaseOut: tokens.animation.easing.out,
      
      // 控件高度
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      controlHeightXS: 24,
      
      // 线条宽度
      lineWidth: 1,
      lineWidthBold: 2,
      
      // Z-index
      zIndexBase: tokens.zIndex[0],
      zIndexPopupBase: tokens.zIndex.dropdown
    },
    
    // 组件级别的主题配置
    components: {
      // 布局组件
      Layout: {
        siderBg: isDark ? tokens.colors.gray[900] : tokens.colors.white,
        headerBg: isDark ? tokens.colors.gray[800] : tokens.colors.white,
        bodyBg: isDark ? tokens.colors.gray[900] : tokens.colors.gray[50],
        footerBg: isDark ? tokens.colors.gray[800] : tokens.colors.white,
        triggerBg: isDark ? tokens.colors.gray[700] : tokens.colors.gray[200],
        triggerColor: isDark ? tokens.colors.gray[300] : tokens.colors.gray[600]
      },
      
      // 按钮组件
      Button: {
        borderRadius: tokens.borderRadius.lg,
        controlHeight: 40,
        controlHeightLG: 48,
        controlHeightSM: 32,
        fontWeight: tokens.typography.fontWeight.medium,
        paddingInline: 20,
        paddingInlineLG: 24,
        paddingInlineSM: 16,
        boxShadow: tokens.boxShadow.sm,
        primaryShadow: `0 2px 0 ${tokens.colors.primary[600]}20`
      },
      
      // 卡片组件
      Card: {
        borderRadius: tokens.borderRadius['2xl'],
        boxShadow: tokens.boxShadow.md,
        headerBg: 'transparent',
        headerHeight: 56,
        headerHeightSM: 48,
        paddingLG: 24,
        padding: 20,
        paddingSM: 16
      },
      
      // 输入组件
      Input: {
        borderRadius: tokens.borderRadius.lg,
        controlHeight: 40,
        controlHeightLG: 48,
        controlHeightSM: 32,
        paddingInline: 16,
        paddingInlineLG: 20,
        paddingInlineSM: 12,
        fontSize: 14,
        fontSizeLG: 16,
        fontSizeSM: 12
      },
      
      // 选择器组件
      Select: {
        borderRadius: tokens.borderRadius.lg,
        controlHeight: 40,
        controlHeightLG: 48,
        controlHeightSM: 32,
        optionPadding: '8px 16px',
        optionSelectedBg: isDark ? tokens.colors.primary[900] : tokens.colors.primary[50]
      },
      
      // 表格组件
      Table: {
        borderRadius: tokens.borderRadius.lg,
        headerBg: isDark ? tokens.colors.gray[800] : tokens.colors.gray[50],
        headerColor: isDark ? tokens.colors.gray[200] : tokens.colors.gray[700],
        rowHoverBg: isDark ? tokens.colors.gray[800] : tokens.colors.gray[50],
        cellPaddingBlock: 12,
        cellPaddingInline: 16
      },
      
      // 模态框组件
      Modal: {
        borderRadius: tokens.borderRadius['2xl'],
        headerBg: 'transparent',
        contentBg: isDark ? tokens.colors.gray[800] : tokens.colors.white,
        footerBg: 'transparent',
        paddingLG: 24,
        padding: 20,
        paddingSM: 16
      },
      
      // 抽屉组件
      Drawer: {
        borderRadius: tokens.borderRadius['2xl'],
        headerHeight: 56,
        bodyPadding: 24,
        footerPaddingBlock: 16,
        footerPaddingInline: 24
      },
      
      // 标签页组件
      Tabs: {
        borderRadius: tokens.borderRadius.lg,
        cardBg: isDark ? tokens.colors.gray[800] : tokens.colors.white,
        cardHeight: 48,
        cardPadding: '8px 16px',
        horizontalMargin: '0 0 16px 0',
        verticalItemPadding: '12px 16px'
      },
      
      // 标签组件
      Tag: {
        borderRadius: tokens.borderRadius.full,
        paddingInline: 12,
        paddingBlock: 4,
        fontSize: 12,
        fontWeight: tokens.typography.fontWeight.medium
      },
      
      // 进度条组件
      Progress: {
        borderRadius: tokens.borderRadius.full,
        lineBorderRadius: tokens.borderRadius.full,
        circleTextFontSize: 14,
        circleIconFontSize: 24
      },
      
      // 警告组件
      Alert: {
        borderRadius: tokens.borderRadius.lg,
        padding: 16,
        paddingMD: 20,
        paddingLG: 24,
        withDescriptionPadding: 20,
        withDescriptionPaddingLG: 24
      },
      
      // 消息组件
      Message: {
        borderRadius: tokens.borderRadius.lg,
        contentPadding: '12px 16px',
        contentBg: isDark ? tokens.colors.gray[800] : tokens.colors.white
      },
      
      // 通知组件
      Notification: {
        borderRadius: tokens.borderRadius['2xl'],
        padding: 20,
        paddingLG: 24,
        width: 384
      },
      
      // 工具提示组件
      Tooltip: {
        borderRadius: tokens.borderRadius.md,
        paddingXS: 8,
        paddingSM: 12,
        fontSize: 12
      },
      
      // 气泡确认框组件
      Popconfirm: {
        borderRadius: tokens.borderRadius.lg,
        minWidth: 280,
        zIndexPopup: tokens.zIndex.popover
      },
      
      // 下拉菜单组件
      Dropdown: {
        borderRadius: tokens.borderRadius.lg,
        paddingBlock: 8,
        zIndexPopup: tokens.zIndex.dropdown
      },
      
      // 菜单组件
      Menu: {
        borderRadius: tokens.borderRadius.md,
        itemBorderRadius: tokens.borderRadius.md,
        itemHeight: 40,
        itemPaddingInline: 16,
        subMenuItemBorderRadius: tokens.borderRadius.md,
        groupTitleColor: isDark ? tokens.colors.gray[400] : tokens.colors.gray[500],
        groupTitleFontSize: 12
      }
    }
  };
};

// 预定义的主题
export const lightTheme = createAntdTheme('light');
export const darkTheme = createAntdTheme('dark');

// 默认导出
export default {
  createAntdTheme,
  lightTheme,
  darkTheme
};
