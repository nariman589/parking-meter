//@ts-nocheck
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

function getConfigPath() {
  // В продакшн-версии используем путь относительно исполняемого файла
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'hardware_config.json')
  }
  // В режиме разработки используем путь относительно текущей директории
  else {
    return path.join(__dirname, '../../hardware_config.json')
  }
}

function loadConfig() {
  const configPath = getConfigPath()
  try {
    // Синхронное чтение файла, так как это делается при запуске приложения
    const rawData = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(rawData)
    console.log('Configuration loaded successfully')
    return config
  } catch (error) {
    console.error('Error loading configuration:', error)
    throw error
  }
}

export default loadConfig
