//@ts-nocheck
const { SerialPort } = require('serialport')
import EventEmitter from 'events'

class CardReaderDriver extends EventEmitter {
  constructor(options = {}) {
    super()
    this.MSG_STX = 0x02
    this.MSG_PROTOCOL_VER = 0x01
    this.MSG_ETX_END = 0x03
    this.MSG_PANO_BASE = 1000
    this.MSG_ACK = 0x06

    this.sg_usPaNo = this.MSG_PANO_BASE
    this.sg_usFrNo = 0

    this.gusFrSize = 0
    this.gusPaSize = 0

    this.cardInfo = ''
    this.port = null
    this.isConnected = false
    this.syncInterval = options.syncInterval || 5000 // Sync interval in ms
    this.syncTimer = null
  }

  async openPort(portPath, options = {}) {
    return new Promise((resolve, reject) => {
      this.port = new SerialPort(
        {
          path: portPath,
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        },
        (err) => {
          if (err) {
            this.emit('error', `Port opening error: ${err.message}`)
            reject(err)
          } else {
            this.isConnected = true
            this.emit('connected')
            this.startSyncTimer()
            resolve()
          }
        }
      )

      this.port.on('error', (error) => {
        this.emit('error', `Serial port error: ${error.message}`)
        this.isConnected = false
      })

      this.port.on('close', () => {
        this.isConnected = false
        this.emit('disconnected')
        this.stopSyncTimer()
      })
    })
  }

  closePort() {
    return new Promise((resolve) => {
      if (this.port && this.port.isOpen) {
        this.port.close(() => {
          this.isConnected = false
          this.emit('disconnected')
          this.stopSyncTimer()
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  startSyncTimer() {
    this.syncTimer = setInterval(() => this.sync(), this.syncInterval)
  }

  stopSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  async sync() {
    try {
      const syndata = Buffer.alloc(10)
      syndata[0] = this.MSG_STX
      syndata[1] = this.MSG_PROTOCOL_VER
      syndata[2] = 0x00
      syndata[3] = 0x01
      syndata[4] = 0x00
      syndata[5] = 0x01
      syndata[6] = 0x00
      syndata[7] = 0x00
      syndata[8] = this.msgGenLRC(syndata.slice(0, 8), 0x00)
      syndata[9] = this.MSG_ETX_END

      await this.sendData(syndata)
      const respFrame = await this.receiveData(256)

      if (respFrame[8] === this.MSG_ACK) {
        const usPano = (respFrame[2] << 8) + respFrame[3]
        const usFrno = (respFrame[4] << 8) + respFrame[5]

        if (usPano < this.MSG_PANO_BASE && usFrno === 1) {
          const sizeFrame = await this.receiveData(256)
          this.gusPaSize = sizeFrame.readUInt32BE(8)
          this.gusFrSize = sizeFrame.readUInt32BE(12)
          this.emit('synced', { gusPaSize: this.gusPaSize, gusFrSize: this.gusFrSize })
        } else {
          throw new Error('Invalid values for usPano or usFrno')
        }
      } else {
        throw new Error('ACK not received during synchronization')
      }
    } catch (error) {
      this.emit('error', `Synchronization error: ${error.message}`)
    }
  }

  async startSale(amount) {
    const text = JSON.stringify({
      task: 'sale',
      data: {
        amount: amount.toString(),
        paymentMethod: 'ICC'
      }
    })

    const framePakage = Buffer.alloc(128)
    framePakage[0] = this.MSG_STX
    framePakage[1] = this.MSG_PROTOCOL_VER
    framePakage.writeUInt16BE(this.sg_usPaNo, 2)
    framePakage[4] = 0 // Frame number
    framePakage[5] = 1

    const dataSize = text.length
    framePakage.writeUInt16BE(dataSize, 6)

    Buffer.from(text).copy(framePakage, 8)

    const pos = 8 + text.length
    framePakage[pos] = this.msgGenLRC(framePakage.slice(0, pos), 0x00)
    framePakage[pos + 1] = this.MSG_ETX_END

    const toSend = framePakage.slice(0, pos + 2)

    try {
      await this.sendData(toSend)
      const response = await this.receiveData(256)
      if (response[8] === this.MSG_ACK) {
        this.emit('saleStarted', { amount })
        return true
      }
    } catch (error) {
      this.emit('error', `Sale start error: ${error.message}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  async waitCardProcess(timeout = 60000) {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.receiveData(8 * 1024)
        const dataLen = response.readUInt16BE(6)
        const jsonBytes = response.slice(8, 8 + dataLen)
        const jsonStr = jsonBytes.toString('utf8')
        this.cardInfo = jsonStr

        const payResult = JSON.parse(jsonStr)
        if (payResult.data.result === 'success') {
          this.emit('paymentSuccess', payResult.data)
          return true
        } else {
          this.emit('paymentFailed', payResult.data)
          return false
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          this.emit('error', `JSON parsing error: ${error.message}`)
        } else {
          this.emit('error', `Card processing wait error: ${error.message}`)
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    throw new Error('Card processing wait timeout')
  }

  async sendData(data) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Port is not connected'))
        return
      }
      this.port.write(data, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async receiveData(size, timeout = 2000) {
    return new Promise((resolve, reject) => {
      let responseBuffer = Buffer.alloc(0)
      const dataHandler = (chunk) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk])
        if (
          responseBuffer.length >= size ||
          (responseBuffer.length > 0 &&
            responseBuffer[responseBuffer.length - 1] === this.MSG_ETX_END)
        ) {
          clearTimeout(timer)
          this.port.removeListener('data', dataHandler)
          resolve(responseBuffer)
        }
      }

      const timer = setTimeout(() => {
        this.port.removeListener('data', dataHandler)
        reject(new Error(`Data receive timeout after ${timeout}ms`))
      }, timeout)

      this.port.on('data', dataHandler)
    })
  }

  msgGenLRC(buf, preLRC) {
    return buf.reduce((acc, val) => acc ^ val, preLRC)
  }
}

export default CardReaderDriver
