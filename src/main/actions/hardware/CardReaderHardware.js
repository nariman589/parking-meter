//@ts-nocheck
import EventEmitter from 'events'
import CardReaderDriver from './CardReaderDriver'

class CardReaderHardware extends EventEmitter {
  constructor(portPath, options = {}) {
    super()
    this.portPath = portPath
    this.driver = new CardReaderDriver(options)
    this.isInitialized = false
    this.totalAmount = 0
    this.lastError = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5
    this.reconnectInterval = options.reconnectInterval || 5000

    this.setupDriverListeners()
  }

  setupDriverListeners() {
    this.driver.on('connected', () => {
      this.emit('connected')
      this.reconnectAttempts = 0
    })

    this.driver.on('disconnected', () => {
      this.emit('disconnected')
      this.isInitialized = false
      this.tryReconnect()
    })

    this.driver.on('error', (error) => {
      this.lastError = error
      this.emit('error', error)
    })

    this.driver.on('synced', (data) => {
      this.emit('synced', data)
    })

    this.driver.on('saleStarted', (data) => {
      this.emit('saleStarted', data)
    })

    this.driver.on('paymentSuccess', (data) => {
      this.totalAmount += parseFloat(data.amount)
      this.emit('paymentSuccess', data)
    })

    this.driver.on('paymentFailed', (data) => {
      this.emit('paymentFailed', data)
    })
  }

  async init() {
    try {
      await this.driver.openPort(this.portPath)
      await this.driver.sync()
      this.isInitialized = true
      this.emit('initialized')
    } catch (error) {
      this.lastError = error
      this.emit('error', `Initialization error: ${error.message}`)
      throw error
    }
  }

  async tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', 'Maximum number of reconnection attempts exceeded')
      return
    }

    this.reconnectAttempts++
    try {
      await this.init()
    } catch (error) {
      setTimeout(() => this.tryReconnect(), this.reconnectInterval)
    }
  }

  async startSale(amount) {
    if (!this.isInitialized) {
      throw new Error('Device is not initialized')
    }

    try {
      const saleStarted = await this.driver.startSale(amount)
      if (saleStarted) {
        const result = await this.driver.waitCardProcess()
        return result
      } else {
        throw new Error('Failed to start sale')
      }
    } catch (error) {
      this.lastError = error
      this.emit('error', `Error during sale: ${error.message}`)
      throw error
    }
  }

  getLastError() {
    return this.lastError
  }

  getTotalAmount() {
    return this.totalAmount
  }

  async reset() {
    this.totalAmount = 0
    this.lastError = null
    await this.driver.closePort()
    await this.init()
  }

  async dispose() {
    await this.driver.closePort()
    this.removeAllListeners()
  }
}

export default CardReaderHardware
