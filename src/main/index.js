//@ts-nocheck
import { app, BrowserWindow, ipcMain } from 'electron'
import * as url from 'url'
import * as path from 'path'
import HardwareManager from './actions/hardware/HardwareManager'
import loadConfig from './actions/loadConfig'
// import ReceiptPrinter from './actions/hardware/ReceiptPrinterHardware'
import { usb, getDeviceList, findByIds } from 'usb'
const exec = require('child_process').exec
exec('NET SESSION', function (err, so, se) {
  if (err) {
    console.log('Application is not running with administrator privileges')
  } else {
    console.log('Application is running with administrator privileges')
  }
})
const si = require('systeminformation')

// si.usb().then(console.log)

const ESC = '\x1B'
const GS = '\x1D'
const INIT = ESC + '@'
const CUT = GS + 'V' + '\x00'

function createReceiptBuffer() {
  return Buffer.from(
    [
      INIT,
      'Квитанция\n',
      '-----------------\n',
      'Парковка: Central City Parking\n',
      'Номер: ABC123\n',
      `Время: ${new Date().toLocaleString()}\n`,
      'Сумма: 500 тг\n',
      '\n\n\n',
      CUT
    ].join(''),
    'ascii'
  )
}

function findPrinter() {
  // Замените VID и PID на значения вашего принтера
  const VID = 0x0dd4 // Идентификатор производителя
  const PID = 0x01a8 // Идентификатор продукта

  const device = findByIds(VID, PID)
  if (!device) {
    throw new Error('Printer not found')
  }
  return device
}

function sendToPrinter(device, data) {
  return new Promise((resolve, reject) => {
    device.open()

    // Найдите правильный интерфейс и конечную точку
    const interfaceD = device.interface(0)
    if (interfaceD.isKernelDriverActive()) {
      interfaceD.detachKernelDriver()
    }
    interfaceD.claim()

    const endpointOut = interfaceD.endpoints.find((endpoint) => endpoint.direction === 'out')

    endpointOut.transfer(data, (error) => {
      interfaceD.release(() => {
        device.close()
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  })
}

async function printReceipt() {
  try {
    const device = findPrinter()
    const receiptBuffer = createReceiptBuffer()
    await sendToPrinter(device, receiptBuffer)
    console.log('Receipt printed successfully')
  } catch (error) {
    console.error('Error printing receipt:', error)
  }
}

printReceipt()

let mainWindow
let hardwareManager

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Parkomat',
    autoHideMenuBar: true,
    fullscreen: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      webSecurity: false,
      sandbox: false,
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  // Определение пути к index.html
  const indexPath = app.isPackaged
    ? path.join(__dirname, '../renderer/index.html') // Путь в собранном приложении
    : url.format({
        // Путь в режиме разработки
        pathname: path.join(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true
      })

  // Открытие DevTools (можно убрать в production)
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.loadURL(indexPath)
}

async function initializeHardwareManager(config) {
  hardwareManager = new HardwareManager(config)
  console.log('HardwareManager created')

  hardwareManager.on('coinInserted', (coinData) => {
    mainWindow.webContents.send('coin-inserted', coinData)
  })

  hardwareManager.on('billInserted', (billData) => {
    mainWindow.webContents.send('bill-inserted', billData)
  })

  hardwareManager.on('coinAcceptorError', (error) => {
    mainWindow.webContents.send('coin-acceptor-error', error)
  })

  hardwareManager.on('billAcceptorError', (error) => {
    mainWindow.webContents.send('bill-acceptor-error', error)
  })

  hardwareManager.on('cardReaderError', (error) => {
    mainWindow.webContents.send('card-reader-error', error)
  })

  hardwareManager.on('cardPaymentSuccess', (paymentData) => {
    mainWindow.webContents.send('card-payment-success', paymentData)
  })

  hardwareManager.on('cardPaymentFailed', (failureData) => {
    mainWindow.webContents.send('card-payment-failed', failureData)
  })

  hardwareManager.on('totalAmountChanged', (totalAmount) => {
    mainWindow.webContents.send('total-amount-changed', totalAmount)
  })
}

app.whenReady().then(async () => {
  console.log('App is ready')
  createMainWindow()
  console.log('Window created')

  const config = loadConfig()
  console.log('Configuration loaded successfully')
  console.log('Config loaded:', config)

  await initializeHardwareManager(config)

  setupIpcHandlers(config)
})

function setupIpcHandlers(config) {
  ipcMain.handle('get-config', () => {
    return config
  })
  ipcMain.handle('initialize-hardware', async () => {
    try {
      const result = await hardwareManager.initializeHardware()
      return result
    } catch (error) {
      console.error('Error initializing hardware:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('activate-hardware', async () => {
    try {
      const result = await hardwareManager.activateHardware()
      return result
    } catch (error) {
      console.error('Error activating hardware:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('initialize-and-activate-hardware', async () => {
    try {
      await hardwareManager.initializeHardware()
      await hardwareManager.activateHardware()
      return { success: true }
    } catch (error) {
      console.error('Error initializing and activating hardware:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('deactivate-hardware', async () => {
    try {
      const result = await hardwareManager.deactivateHardware()
      return result
    } catch (error) {
      console.error('Error deactivating hardware:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-total-amount', () => {
    return hardwareManager.getTotalAmount()
  })

  ipcMain.handle('reset-total-amount', async () => {
    try {
      const result = await hardwareManager.resetTotalAmount()
      return result
    } catch (error) {
      console.error('Error resetting total amount:', error)
      return { success: false, error: error.message }
    }
  })

  // New handlers for card reader operations
  ipcMain.handle('initialize-card-reader', async () => {
    try {
      const result = await hardwareManager.initializeCardReader()
      return result
    } catch (error) {
      console.error('Error initializing card reader:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('start-card-sale', async (event, amount) => {
    try {
      const result = await hardwareManager.startCardSale(amount)
      return result
    } catch (error) {
      console.error('Error starting card sale:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-card-reader-last-error', () => {
    return hardwareManager.getCardReaderLastError()
  })

  ipcMain.handle('reset-card-reader', async () => {
    try {
      const result = await hardwareManager.resetCardReader()
      return result
    } catch (error) {
      console.error('Error resetting card reader:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dispose-all', async () => {
    try {
      const result = await hardwareManager.dispose()
      return result
    } catch (error) {
      console.error('Error disposing:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dispose-bill-acceptor', async () => {
    try {
      const result = await hardwareManager.disposeBillAcceptor()
      return result
    } catch (error) {
      console.error('Error disposing:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dispose-coin-acceptor', async () => {
    try {
      const result = await hardwareManager.disposeCoinAcceptor()
      return result
    } catch (error) {
      console.error('Error disposing:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dispose-card-reader', async () => {
    try {
      const result = await hardwareManager.disposeCardReader()
      return result
    } catch (error) {
      console.error('Error disposing:', error)
      return { success: false, error: error.message }
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

app.on('before-quit', async () => {
  if (hardwareManager) {
    await hardwareManager.dispose()
  }
})
