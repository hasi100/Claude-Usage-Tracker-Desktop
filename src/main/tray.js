const { Tray, Menu, nativeImage } = require('electron')
const path = require('path')

let tray = null

function getColorForPct(pct) {
  if (pct >= 90) return 'red'
  if (pct >= 70) return 'yellow'
  return 'green'
}

function createTrayIcon(color) {
  // 16x16 colored circle as PNG data URL
  const colors = {
    green: [74, 222, 128],
    yellow: [250, 204, 21],
    red: [239, 68, 68],
  }
  const [r, g, b] = colors[color] || colors.green

  // Create a simple 16x16 PNG buffer with a filled circle
  const size = 16
  const png = createCirclePNG(size, r, g, b)
  return nativeImage.createFromBuffer(png, { width: size, height: size })
}

function createCirclePNG(size, r, g, b) {
  // Minimal PNG: 16x16 RGBA circle
  const pixels = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 1

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      const idx = (y * size + x) * 4
      if (dist <= radius) {
        pixels[idx] = r
        pixels[idx + 1] = g
        pixels[idx + 2] = b
        pixels[idx + 3] = 255
      } else {
        pixels[idx + 3] = 0
      }
    }
  }

  return encodePNG(size, size, pixels)
}

// Minimal PNG encoder
function encodePNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = makeChunk('IHDR', (() => {
    const b = Buffer.alloc(13)
    b.writeUInt32BE(width, 0)
    b.writeUInt32BE(height, 4)
    b[8] = 8  // bit depth
    b[9] = 6  // RGBA
    return b
  })())

  // Build raw image data with filter bytes
  const raw = []
  for (let y = 0; y < height; y++) {
    raw.push(0) // filter type None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])
    }
  }

  const zlib = require('zlib')
  const compressed = zlib.deflateSync(Buffer.from(raw))
  const idat = makeChunk('IDAT', compressed)
  const iend = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

function makeChunk(type, data) {
  const zlib = require('zlib')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcData)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc >>> 0, 0)
  return Buffer.concat([len, typeBuffer, data, crcBuf])
}

function crc32(buf) {
  const table = makeCrcTable()
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

let _crcTable = null
function makeCrcTable() {
  if (_crcTable) return _crcTable
  _crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    _crcTable[n] = c
  }
  return _crcTable
}

function setupTray(mainWindow, store) {
  const icon = createTrayIcon('green')
  tray = new Tray(icon)
  tray.setToolTip('Claude Usage Tracker')

  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: mainWindow.isVisible() ? 'Hide' : 'Show',
        click: () => {
          if (mainWindow.isVisible()) mainWindow.hide()
          else mainWindow.show()
        },
      },
      {
        label: 'Refresh Now',
        click: () => mainWindow.webContents.send('usage:force-refresh'),
      },
      {
        label: 'Settings',
        click: () => {
          mainWindow.show()
          mainWindow.webContents.send('ui:open-settings')
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          mainWindow.removeAllListeners('close')
          mainWindow.close()
          require('electron').app.quit()
        },
      },
    ])

  tray.on('right-click', () => tray.popUpContextMenu(buildMenu()))
  tray.on('click', () => {
    if (mainWindow.isVisible()) mainWindow.focus()
    else mainWindow.show()
  })
}

function updateTrayIcon(maxPct) {
  if (!tray) return
  const color = getColorForPct(maxPct)
  tray.setImage(createTrayIcon(color))
}

module.exports = { setupTray, updateTrayIcon }
