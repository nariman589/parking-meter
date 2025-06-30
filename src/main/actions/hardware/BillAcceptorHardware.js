//@ts-nocheck
const { SerialPort } = require('serialport')
import EventEmitter from 'events'

class BillValidatorCommands {
  static ACK = 0x00
  static NAK = 0xff
  static POLL = 0x33
  static RESET = 0x30
  static GET_STATUS = 0x31
  static SET_SECURITY = 0x32
  static IDENTIFICATION = 0x37
  static ENABLE_BILL_TYPES = 0x34
  static STACK = 0x35
}

class Package {
  static POLYNOMIAL = 0x08408
  static SYNC = 0x02
  static ADR = 0x03

  constructor(cmd, data) {
    this.cmd = cmd
    this.data = data
  }

  getBytes() {
    let buff = [Package.SYNC, Package.ADR]
    let length = (this.data ? this.data.length : 0) + 6
    buff.push(length > 250 ? 0 : length)
    buff.push(this.cmd)
    if (this.data) {
      buff = buff.concat(Array.from(this.data))
    }
    let crc = Package.getCRC16(buff)
    return Buffer.from([...buff, ...crc])
  }

  static getCRC16(data) {
    let crc = 0
    for (let byte of data) {
      crc ^= byte
      for (let j = 0; j < 8; j++) {
        crc = crc & 1 ? (crc >> 1) ^ Package.POLYNOMIAL : crc >> 1
      }
    }
    return [crc & 0xff, (crc >> 8) & 0xff]
  }

  static checkCRC(buff) {
    if (buff.length < 5) return false
    let oldCRC = buff.slice(-2)
    let newCRC = Package.getCRC16(buff.slice(0, -2))
    return oldCRC[0] === newCRC[0] && oldCRC[1] === newCRC[1]
  }
}

class CashCodeBillValidator extends EventEmitter {
  constructor(portName) {
    super()
    this.portName = portName
    this.baudRate = 9600
    this.isConnected = false
    this.isPowerUp = false
    this.isListening = false
    this.port = null
    this.ENABLE_BILL_TYPES = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
    this.lastStatus = null
    this.cassettestatus = 'Inplace'
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async connectBillValidator() {
    try {
      this.port = new SerialPort({ path: this.portName, baudRate: this.baudRate })
      await new Promise((resolve, reject) => {
        this.port.on('open', resolve)
        this.port.on('error', reject)
      })
      this.isConnected = true
      console.log('Bill validator connected successfully')
      return true
    } catch (error) {
      console.error('Error opening COM port:', error)
      return false
    }
  }

  async powerUpBillValidator() {
    if (!this.isConnected) throw new Error('Com-port not open')

    try {
      console.log('Starting power up sequence...')

      await this.sendCommand(BillValidatorCommands.POLL)
      await this.sendCommand(BillValidatorCommands.ACK)

      await this.sendCommand(BillValidatorCommands.RESET)

      await this.sendCommand(BillValidatorCommands.POLL)
      await this.sendCommand(BillValidatorCommands.ACK)

      await this.sendCommand(BillValidatorCommands.GET_STATUS)
      await this.sendCommand(BillValidatorCommands.ACK)

      await this.sendCommand(BillValidatorCommands.SET_SECURITY, Buffer.from([0x00, 0x00, 0x00]))

      await this.sendCommand(BillValidatorCommands.IDENTIFICATION)
      await this.sendCommand(BillValidatorCommands.ACK)

      await this.sendCommand(BillValidatorCommands.POLL)
      await this.sendCommand(BillValidatorCommands.ACK)

      this.isPowerUp = true
      console.log('Bill validator power up sequence completed successfully')
    } catch (error) {
      console.error('Power up failed:', error)
      throw error
    }
  }

  async enableBillValidator() {
    if (!this.isConnected || !this.isPowerUp) throw new Error('Bill validator not ready')

    try {
      const response = await this.sendCommand(
        BillValidatorCommands.ENABLE_BILL_TYPES,
        this.ENABLE_BILL_TYPES
      )
      if (
        response[3] === BillValidatorCommands.ACK ||
        response[3] === BillValidatorCommands.ENABLE_BILL_TYPES
      ) {
        console.log('Bill validator enabled successfully')
        this.isEnabled = true
      } else {
        throw new Error(
          `Unexpected response when enabling bill validator: ${response[3].toString(16)}`
        )
      }
    } catch (error) {
      console.error('Error enabling bill validator:', error)
      throw error
    }
  }

  async disableBillValidator() {
    if (!this.isConnected) throw new Error('Com-port not open')

    try {
      await this.sendCommand(
        BillValidatorCommands.ENABLE_BILL_TYPES,
        Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
      )
      console.log('Bill validator disabled successfully')
    } catch (error) {
      console.error('Error disabling bill validator:', error)
      throw error
    }
  }

  startListening() {
    if (!this.isConnected || !this.isPowerUp || !this.isEnabled) {
      throw new Error('Bill validator not ready for listening')
    }

    this.isListening = true
    this.pollInterval = setInterval(() => this.poll(), 500)
    console.log('Started listening to bill validator')
  }

  stopListening() {
    this.isListening = false
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }
    console.log('Stopped listening to bill validator')
  }

  async poll() {
    try {
      let result = await this.sendCommand(BillValidatorCommands.POLL)
      this.handlePollResponse(result)
    } catch (error) {
      console.error('Error during poll:', error)
      this.emit('error', error)
    }
  }

  handlePollResponse(result) {
    const status = result[9]
    if (status !== this.lastStatus) {
      console.log(
        `Bill validator status changed from ${this.lastStatus ? this.lastStatus.toString(16) : 'null'} to ${status.toString(16)}`
      )
      this.lastStatus = status
    }
    switch (status) {
      case 0x14:
      case 0x33:
        break // Idling
      case 0x15:
        console.log('Bill is being accepted')
        this.sendCommand(BillValidatorCommands.ACK)
        break
      case 0x1c:
        console.log(result[10])

        console.log('Bill is being rejected')
        this.sendCommand(BillValidatorCommands.ACK)
        this.emit('billRejected', { reason: this.getRejectReason(result[4]) })
        break
      case 0x80:
        const value = this.cashCodeTable(result[10])
        console.log(`Bill recognized: ${value} KZT`)
        this.sendCommand(BillValidatorCommands.ACK)
        this.emit('billRecognized', { value })
        this.emit('billStacking', { value })
        this.sendCommand(BillValidatorCommands.STACK)
        break
      case 0x81:
        const stackedValue = this.cashCodeTable(result[10])
        console.log(`Bill stacked: ${stackedValue} KZT`)
        this.sendCommand(BillValidatorCommands.ACK)
        this.emit('billReceived', { status: 'Accepted', value: stackedValue })
        break
      case 0x82:
        console.log('Bill returned')
        this.sendCommand(BillValidatorCommands.ACK)
        this.emit('billReturned')
        break
      case 0x42:
        if (this.cassettestatus !== 'Removed') {
          this.cassettestatus = 'Removed'
          this.emit('billCassetteStatus', { status: this.cassettestatus })
        }
        break
      case 0x13:
        if (this.cassettestatus === 'Removed') {
          this.cassettestatus = 'Inplace'
          this.emit('billCassetteStatus', { status: this.cassettestatus })
        }
        break
      default:
        console.log(`Unhandled poll response: ${result.toString('hex')}`)
    }
  }

  async sendCommand(cmd, data = null) {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port is not open')
    }

    let pkg = new Package(cmd, data)
    let bytes = pkg.getBytes()

    return new Promise((resolve, reject) => {
      let responseBuffer = Buffer.from([])
      const dataHandler = (chunk) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk])
      }

      this.port.write(bytes, (err) => {
        if (err) {
          reject(err)
        } else {
          this.port.on('data', dataHandler)

          setTimeout(() => {
            this.port.removeListener('data', dataHandler)
            if (Package.checkCRC(responseBuffer)) {
              resolve(responseBuffer)
            } else {
              console.warn(`CRC check failed for command ${cmd.toString(16)}`)
              resolve(responseBuffer)
            }
          }, 100)
        }
      })
    })
  }

  getRejectReason(code) {
    const reasons = {
      0x60: 'Insertion',
      0x61: 'Magnetic',
      0x62: 'Remained bill in head',
      0x63: 'Multiplying',
      0x64: 'Conveying',
      0x65: 'Identification1',
      0x66: 'Verification',
      0x67: 'Optic',
      0x68: 'Inhibit',
      0x69: 'Capacity',
      0x6a: 'Operation',
      0x6c: 'Length'
    }
    return reasons[code] ? `Rejecting due to ${reasons[code]}` : 'Unknown rejection reason'
  }

  cashCodeTable(code) {
    const values = {
      0x02: 200,
      0x03: 1000,
      0x04: 2000,
      0x05: 5000,
      0x06: 10000,
      0x07: 20000
    }
    return values[code] || 0
  }
}

export default CashCodeBillValidator
