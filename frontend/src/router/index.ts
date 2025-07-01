/**
 * Vue Router 路由配置
 * VideoChat应用的路由系统
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 路由记录类型定义
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/home',
    children: [
      {
        path: '/home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: {
          title: '首页',
          icon: '🏠',
          requiresAuth: false,
        },
      },
      {
        path: '/workspace',
        name: 'Workspace',
        component: () => import('@/views/Workspace.vue'),
        meta: {
          title: '工作台',
          icon: '💼',
          requiresAuth: false,
        },
      },
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: {
          title: '仪表板',
          icon: '📊',
          requiresAuth: false,
        },
      },
      {
        path: '/upload',
        name: 'Upload',
        component: () => import('@/views/Upload.vue'),
        meta: {
          title: '文件上传',
          icon: '📁',
          requiresAuth: false,
        },
      },
      {
        path: '/transcription',
        name: 'Transcription',
        component: () => import('@/views/Transcription.vue'),
        meta: {
          title: '音视频转录',
          icon: '🎵',
          requiresAuth: false,
        },
      },
      {
        path: '/ai-features',
        name: 'AIFeatures',
        component: () => import('@/views/AIFeatures.vue'),
        meta: {
          title: 'AI功能',
          icon: '🤖',
          requiresAuth: false,
        },
      },
      {
        path: '/video-download',
        name: 'VideoDownload',
        component: () => import('@/views/VideoDownload.vue'),
        meta: {
          title: '视频下载',
          icon: '⬇️',
          requiresAuth: false,
        },
      },
      {
        path: '/export',
        name: 'Export',
        component: () => import('@/views/Export.vue'),
        meta: {
          title: '数据导出',
          icon: '📤',
          requiresAuth: false,
        },
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: {
          title: '设置',
          icon: '⚙️',
          requiresAuth: false,
        },
      },
    ],
  },
  {
    path: '/design-system',
    name: 'DesignSystem',
    component: () => import('@/views/DesignSystem.vue'),
    meta: {
      title: '设计系统',
      icon: '🎨',
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到',
      hideInMenu: true,
    },
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    // 路由切换时的滚动行为
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// 全局前置守卫
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - VideoChat`
  } else {
    document.title = 'VideoChat - 深空极光'
  }

  // 权限检查（暂时跳过，后续可以添加）
  if (to.meta?.requiresAuth) {
    // TODO: 检查用户认证状态
    // 暂时允许所有访问
    next()
  } else {
    next()
  }
})

// 全局后置钩子
router.afterEach((to, from) => {
  // 路由切换完成后的处理
  console.log(`路由切换: ${from.path} -> ${to.path}`)
})

export default router

// 导出路由相关类型和工具函数
export type { RouteRecordRaw }

/**
 * 获取菜单路由列表
 */
export const getMenuRoutes = (): RouteRecordRaw[] => {
  const layoutRoute = routes.find((route) => route.name === 'Layout')
  if (layoutRoute?.children) {
    return layoutRoute.children.filter((route) => !route.meta?.hideInMenu)
  }
  return []
}

/**
 * 根据路由名称获取路由信息
 */
export const getRouteByName = (name: string): RouteRecordRaw | undefined => {
  const findRoute = (routes: RouteRecordRaw[]): RouteRecordRaw | undefined => {
    for (const route of routes) {
      if (route.name === name) {
        return route
      }
      if (route.children) {
        const found = findRoute(route.children)
        if (found) return found
      }
    }
    return undefined
  }
  return findRoute(routes)
}
