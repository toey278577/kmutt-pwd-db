import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import process from 'node:process'

// ฉีดเลขเวอร์ชัน + วันที่ build เข้าไปในแอป (ใช้โชว์หน้า login)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  // ตอน dev ส่ง /api ไปที่ backend เอง — รูปถ่ายเก็บเป็นไฟล์แล้วอ้างด้วย path /api/uploads/...
  // ถ้าไม่ proxy รูปจะไม่ขึ้นตอน dev (บน production nginx จัดการให้อยู่แล้ว)
  server: {
    proxy: {
      // ชุดทดสอบ (tests/run.cjs) ชี้ไปหลังบ้านตัวทดสอบผ่าน API_PROXY_TARGET
      '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // อัปเดตตัวเก็บไฟล์อัตโนมัติ (เหมือนเดิม) แต่ลงทะเบียนเองใน components/UpdateBanner.jsx
      // เพื่อขึ้นแถบ "มีเวอร์ชันใหม่ กดโหลดใหม่" — เดิมแท็บที่เปิดค้างเห็นหน้าตาเก่าโดยไม่รู้ตัว
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['logo-icon.png', 'logo.jpg', 'favicon.svg'],
      manifest: {
        name: 'ระบบฐานข้อมูลคนพิการ มจธ.',
        short_name: 'PWDs มจธ.',
        description: 'ระบบฐานข้อมูลคนพิการ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี',
        theme_color: '#9a3412',
        background_color: '#fff7ed',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'th',
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // ตัวใหม่เข้าทำงานทันทีที่ deploy (เดิมรอคิวจนกว่าจะปิดทุกแท็บ — รีเฟรชแท็บเดิมก็ยังได้ของเก่า)
        // หน้าที่เปิดค้างอยู่จะขึ้นแถบ "มีเวอร์ชันใหม่" (components/UpdateBanner.jsx) · ลบไฟล์เวอร์ชันเก่าทิ้ง
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
