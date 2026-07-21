/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/bilibili': {
        target: 'https://api.bilibili.com',
        changeOrigin: true,
        cookieDomainRewrite: {
          // 将 B 站域名的 Set-Cookie 重写到 localhost，让浏览器存储
          '.bilibili.com': 'localhost',
          'bilibili.com': 'localhost',
          '.biligame.com': 'localhost',
          'biligame.com': 'localhost',
        },
        cookiePathRewrite: {
          // 确保 cookie path 正确
          '*': '/',
        },
        rewrite: (path) => path.replace(/^\/api\/bilibili/, ''),
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('Referer', 'https://www.bilibili.com')
            proxyReq.setHeader('Origin', 'https://www.bilibili.com')
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            // 如果客户端发送了 Cookie，自动转发
            // http-proxy 默认会转发 Cookie header
          })
          // 处理响应：确保 Set-Cookie 被正确转发
          proxy.on('proxyRes', (proxyRes) => {
            // http-proxy 默认会转发 Set-Cookie
            // cookieDomainRewrite 已经处理了域名重写
            const setCookie = proxyRes.headers?.['set-cookie']
            if (setCookie) {
              // 确保 Secure 标记不会阻止 localhost (http) 存储
              proxyRes.headers['set-cookie'] = (Array.isArray(setCookie) ? setCookie : [setCookie]).map(
                (c) =>
                  c
                    .replace(/;\s*Secure/gi, '')
                    .replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax')
              )
            }
          })
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
})
