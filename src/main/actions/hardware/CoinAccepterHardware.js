//@ts-nocheck
const { SerialPort } = require('serialport')
import EventEmitter from 'events'

class CoinAccepterHardware extends EventEmitter {
  constructor(portPath) {
    super()
    this.address = 2
    this.portPath = portPath
    this.port = null
    this.coins = {
      8: { name: 'KZ005B', value: 5 },
      7: { name: 'KZ005B', value: 5 },
      1: { name: 'KZ010A', value: 10 },
      6: { name: 'KZ020A', value: 20 },
      3: { name: 'KZ050A', value: 50 },
      4: { name: 'KZ100A', value: 100 },
      9: { name: 'KZ200A', value: 200 }
    }
    this.isInitialized = false
    this.pollInterval = 200 // ms
    this.pollTimer = null
    this.lastEventCounter = null
    this.totalAmount = 0
  }

  async fullReset() {
    console.log('Performing full reset of the coin acceptor...')

    // Disable all coin acceptance
    await this.sendCCTalkCommand(this.address, 228, [1])

    // Reset device
    await this.sendCCTalkCommand(this.address, 1)

    // Wait for the device to restart
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Re-enable all coin acceptance
    await this.sendCCTalkCommand(this.address, 228, [0])

    // Clear the event buffer
    await this.clearEventBuffer()

    // Reset the total amount
    this.totalAmount = 0

    console.log('Full reset completed. Total amount set to 0.')
  }

  async init() {
    try {
      await this.openPort()
      console.log('Port opened successfully')

      await this.fullReset()

      await this.sendCCTalkCommand(this.address, 254) // Simple poll
      await this.sendCCTalkCommand(this.address, 231, [255, 255]) // Enable all coin channels

      this.isInitialized = true

      console.log('Coin acceptor initialized and ready')
    } catch (error) {
      console.error('Initialization error:', error)
      throw error
    }
  }

  async clearEventBuffer() {
    const { data } = await this.sendCCTalkCommand(this.address, 229)
    this.lastEventCounter = data[0]
    console.log(`Event buffer cleared. Current counter: ${this.lastEventCounter}`)
  }

  openPort() {
    return new Promise((resolve, reject) => {
      this.port = new SerialPort({ path: this.portPath, baudRate: 9600 }, (err) => {
        if (err) {
          reject(err)
        } else {
          this.port.on('error', (error) => {
            console.error('Serial port error:', error)
            this.emit('error', { errorMessage: `Serial port error: ${error.message}` })
          })
          resolve()
        }
      })
    })
  }

  async sendCCTalkCommand(destination, header, data = []) {
    const message = this.formatCCTalkMessage(destination, header, data)
    // console.log(`Sending command: ${header}, Data: [${data.join(', ')}]`);
    return new Promise((resolve, reject) => {
      let responseBuffer = Buffer.from([])
      const dataHandler = (chunk) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk])
      }

      this.port.write(message, (err) => {
        if (err) {
          reject(err)
        } else {
          this.port.on('data', dataHandler)

          setTimeout(() => {
            this.port.removeListener('data', dataHandler)
            const parsedResponse = this.parseCCTalkResponse(responseBuffer)
            // console.log(`Response for command ${header}:`, parsedResponse.data.toString('hex'));
            resolve(parsedResponse)
          }, 100) // Wait for 500ms to accumulate data
        }
      })
    })
  }

  formatCCTalkMessage(destination, header, data) {
    const dataLength = data.length
    const message = [destination, dataLength, 1, header, ...data]
    const checksum = this.calculateChecksum(message)
    return Buffer.from([...message, checksum])
  }

  parseCCTalkResponse(response) {
    if (response.length < 2) {
      return { header: 0, data: Buffer.from([]) }
    }
    const header = response[response.length - 2]
    const data = response.slice(0, -2)
    return { header, data }
  }

  calculateChecksum(message) {
    let sum = message.reduce((a, b) => a + b, 0)
    return 256 - (sum % 256)
  }

  startPoll() {
    if (this.pollTimer) {
      throw new Error('Already polling')
    }
    if (!this.isInitialized) {
      throw new Error('Device not initialized')
    }
    this.pollTimer = setInterval(() => this.poll(), this.pollInterval)
  }

  async poll() {
    try {
      const { data } = await this.sendCCTalkCommand(this.address, 229) // Read buffered credit or error codes
      this.processCreditOrErrorCodes(data)
    } catch (error) {
      console.error('Polling error:', error)
    }
  }

  processCreditOrErrorCodes(data) {
    if (data.length < 6) {
      return
    }

    const eventCounter = data[9] // The event counter is at index 9

    if (this.lastEventCounter === null) {
      this.lastEventCounter = eventCounter
      return
    }

    let eventsToProcess = eventCounter - this.lastEventCounter
    if (eventsToProcess < 0) {
      eventsToProcess += 256 // Handle wraparound
    }

    for (let i = 0; i < eventsToProcess; i++) {
      const coinCode = data[10 + i * 2]
      const sorterPath = data[11 + i * 2]
      if (coinCode !== 0) {
        if (this.coins[coinCode]) {
          this.coinAccepted({
            CoinName: this.coins[coinCode].name,
            CoinCode: coinCode,
            CoinValue: this.coins[coinCode].value,
            SorterPath: sorterPath
          })
        } else {
          // console.log(`Unknown coin code: ${coinCode}`);
        }
      }
    }

    this.lastEventCounter = eventCounter
  }

  coinAccepted(e) {
    console.log(
      `Credit = ${e.CoinName} (${e.CoinValue}). Sorter path = ${e.SorterPath}. coin code = ${e.CoinCode}`
    )
    this.totalAmount += e.CoinValue
    this.emit('coin', e)
  }

  setOnReceivedCallback(callback) {
    this.onReceived = callback
  }

  stopPoll() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  dispose() {
    this.stopPoll()
    if (this.port && this.port.isOpen) {
      this.port.close()
    }
    this.isInitialized = false
  }
}

export default CoinAccepterHardware
