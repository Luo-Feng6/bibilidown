const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

/* ── Platform-specific FFmpeg download URLs ── */

const PLATFORM_URLS = {
  'win32-x64': 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
}

/* ── Public API ── */

/**
 * Download and install FFmpeg for the current platform.
 *
 * @param {(data: { phase: string, percent: number, message: string }) => void} onProgress
 * @returns {Promise<string>} Path to the installed ffmpeg executable
 */
async function downloadFfmpeg(onProgress) {
  const platform = process.platform
  const arch = process.arch
  const key = `${platform}-${arch}`
  const url = PLATFORM_URLS[key]

  if (!url) {
    throw new Error(
      `当前平台 ${key} 暂不支持自动安装 FFmpeg，请手动下载：https://ffmpeg.org/download.html`
    )
  }

  const ffmpegDir = path.join(__dirname, '..', 'ffmpeg')
  if (!fs.existsSync(ffmpegDir)) {
    fs.mkdirSync(ffmpegDir, { recursive: true })
  }

  const ffmpegExe = path.join(
    ffmpegDir,
    platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  )
  const tempDir = path.join(ffmpegDir, '.temp')
  const zipPath = path.join(tempDir, 'ffmpeg.zip')

  // Clean up any stale temp files from a previous failed attempt
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
  fs.mkdirSync(tempDir, { recursive: true })

  try {
    /* ── Step 1: Download ── */
    onProgress?.({ phase: 'downloading', percent: 0, message: '正在下载 FFmpeg...' })
    await downloadFile(url, zipPath, (percent) => {
      onProgress?.({
        phase: 'downloading',
        percent,
        message: `正在下载 FFmpeg... ${Math.round(percent)}%`,
      })
    })

    /* ── Step 2: Extract ── */
    onProgress?.({ phase: 'extracting', percent: 100, message: '正在解压...' })
    const extractDir = path.join(tempDir, 'extracted')
    await extractZip(zipPath, extractDir)

    /* ── Step 3: Find and copy ffmpeg binary ── */
    onProgress?.({ phase: 'installing', percent: 100, message: '正在安装...' })
    const extractedFfmpeg = findFfmpegInDir(extractDir)
    if (!extractedFfmpeg) {
      throw new Error('解压后未找到 ffmpeg 可执行文件，请手动安装')
    }

    fs.copyFileSync(extractedFfmpeg, ffmpegExe)

    // Make executable on non-Windows
    if (platform !== 'win32') {
      try {
        fs.chmodSync(ffmpegExe, '755')
      } catch {
        // best-effort
      }
    }

    onProgress?.({ phase: 'complete', percent: 100, message: 'FFmpeg 安装完成' })
    return ffmpegExe
  } finally {
    // Always clean up temp files, even on error
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}

/* ── Helpers ── */

/**
 * Download a file from a URL to a local path, following redirects.
 * Reports progress as a number 0–100 if Content-Length is available,
 * or 0 if the total size is unknown.
 *
 * @param {string} url
 * @param {string} destPath
 * @param {(percent: number) => void} onProgress
 * @param {number} redirectCount
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath, onProgress, redirectCount = 0) {
  if (redirectCount > 10) {
    return Promise.reject(new Error('重定向次数过多，请检查网络连接'))
  }

  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http

    const req = mod.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      (res) => {
        // Handle redirect
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume() // drain the redirect response body
          const redirectUrl = new URL(res.headers.location, url).toString()
          downloadFile(redirectUrl, destPath, onProgress, redirectCount + 1)
            .then(resolve)
            .catch(reject)
          return
        }

        if (res.statusCode !== 200) {
          res.resume()
          reject(
            new Error(`下载失败: HTTP ${res.statusCode} ${res.statusMessage}`)
          )
          return
        }

        const totalSize = parseInt(res.headers['content-length'] || '0', 10)
        let downloadedSize = 0
        let lastReportPct = -1

        const writeStream = fs.createWriteStream(destPath)

        res.on('data', (chunk) => {
          downloadedSize += chunk.length
          writeStream.write(chunk)

          if (totalSize > 0 && onProgress) {
            const pct = Math.min(
              Math.round((downloadedSize / totalSize) * 100),
              99 // cap at 99 until fully done
            )
            if (pct !== lastReportPct) {
              lastReportPct = pct
              onProgress(pct)
            }
          }
        })

        res.on('end', () => {
          writeStream.end()
          onProgress?.(100)
          resolve()
        })

        res.on('error', (err) => {
          writeStream.close()
          try {
            fs.unlinkSync(destPath)
          } catch {}
          reject(new Error(`下载中断: ${err.message}`))
        })

        writeStream.on('error', (err) => {
          res.destroy()
          try {
            fs.unlinkSync(destPath)
          } catch {}
          reject(new Error(`写入文件失败: ${err.message}`))
        })
      }
    )

    req.on('error', (err) => {
      reject(new Error(`网络错误: ${err.message}`))
    })

    req.setTimeout(600000, () => {
      // 10 minutes — FFmpeg zip is ~80 MB
      req.destroy()
      reject(new Error('下载超时（10分钟），请检查网络连接'))
    })
  })
}

/**
 * Extract a zip archive using platform-appropriate tools.
 *
 * @param {string} zipPath
 * @param {string} destDir
 * @returns {Promise<void>}
 */
function extractZip(zipPath, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  try {
    if (process.platform === 'win32') {
      // Use PowerShell's Expand-Archive (built into Windows)
      execSync(
        `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
        { stdio: 'pipe', timeout: 120000 }
      )
    } else {
      // macOS / Linux — use unzip (nearly always available)
      execSync(`unzip -o "${zipPath}" -d "${destDir}"`, {
        stdio: 'pipe',
        timeout: 120000,
      })
    }
  } catch (err) {
    throw new Error(`解压失败: ${err.message}`)
  }
}

/**
 * Recursively search a directory for the ffmpeg binary.
 *
 * @param {string} dir
 * @returns {string | null}
 */
function findFfmpegInDir(dir) {
  const targetName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'

  function search(currentDir) {
    let entries
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch {
      return null
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        const found = search(fullPath)
        if (found) return found
      } else if (entry.name === targetName) {
        return fullPath
      }
    }
    return null
  }

  return search(dir)
}

module.exports = { downloadFfmpeg }
