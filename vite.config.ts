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
          '.bilibili.com': 'localhost',
          'bilibili.com': 'localhost',
          '.biligame.com': 'localhost',
          'biligame.com': 'localhost',
        },
        cookiePathRewrite: { '*': '/' },
        rewrite: (path) => path.replace(/^\/api\/bilibili/, ''),
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Referer', 'https://www.bilibili.com')
            proxyReq.setHeader('Origin', 'https://www.bilibili.com')
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
          })
          proxy.on('proxyRes', (proxyRes) => {
            const setCookie = proxyRes.headers?.['set-cookie']
            if (setCookie) {
              proxyRes.headers['set-cookie'] = (Array.isArray(setCookie) ? setCookie : [setCookie]).map(
                (c) =>
                  c
                    .replace(/;\s*Secure/gi, '')
                    .replace(/;\s*HttpOnly/gi, '')
                    .replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax')
              )
            }
          })
        },
      },
      /* 登录 / 通行证 API 走 passport.bilibili.com */
      '/api/passport': {
        target: 'https://passport.bilibili.com',
        changeOrigin: true,
        cookieDomainRewrite: {
          '.bilibili.com': 'localhost',
          'bilibili.com': 'localhost',
        },
        cookiePathRewrite: { '*': '/' },
        rewrite: (path) => path.replace(/^\/api\/passport/, ''),
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Referer', 'https://www.bilibili.com')
            proxyReq.setHeader('Origin', 'https://www.bilibili.com')
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
          })
          proxy.on('proxyRes', (proxyRes) => {
            const setCookie = proxyRes.headers?.['set-cookie']
            if (setCookie) {
              proxyRes.headers['set-cookie'] = (Array.isArray(setCookie) ? setCookie : [setCookie]).map(
                (c) =>
                  c
                    .replace(/;\s*Secure/gi, '')
                    .replace(/;\s*HttpOnly/gi, '')
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
    exclude: [
      'node_modules/**',
      '.agents/**',
      '.claude/**',
      'legacy-java/**',
      'handover/**',
      'release/**',
      'dist/**',
    ],
  },
})
