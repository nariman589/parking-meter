//@ts-nocheck
import EventEmitter from 'events'
import CoinAccepterHardware from './CoinAccepterHardware'
import BillAcceptorHardware from './BillAcceptorHardware'
import CardReaderHardware from './CardReaderHardware'

class HardwareManager extends EventEmitter {
  constructor(config) {
    super()
    this.config = config
    this.coinAcceptor = null
    this.billAcceptor = null
    this.cardReader = null
    this.isInitialized = false
    this.isCardReaderInitialized = false
    this.isActive = false
    this.totalAmount = 0
  }

  async initializeCardReader() {
    console.log('Starting card reader initialization')
    if (this.isCardReaderInitialized) {
      console.log('Card reader is already initialized')
      return { success: true }
    }
    if (!this.config.cardReader) {
      console.log('Card reader not configured, skipping initialization')
      return { success: false, error: 'Card reader not configured' }
    }

    try {
      console.log('Initializing card reader...')
      this.cardReader = new CardReaderHardware(this.config.cardReader.port)
      await this.cardReader.init()

      this.setupCardReaderListeners()

      this.isCardReaderInitialized = true
      console.log('Card reader successfully initialized')
      return { success: true }
    } catch (error) {
      console.error('Error initializing card reader:', error)
      this.cardReader = null
      this.emit('cardReaderError', {
        errorMessage: `Failed to initialize card reader: ${error.message}`
      })
      return { success: false, error: error.message }
    }
  }

  setupCardReaderListeners() {
    this.cardReader.on('paymentSuccess', (paymentData) => {
      console.log(`Card payment successful: ${JSON.stringify(paymentData)}`)
      this.emit('cardPaymentSuccess', paymentData)
    })

    this.cardReader.on('paymentFailed', (failureData) => {
      console.log(`Card payment failed: ${JSON.stringify(failureData)}`)
      this.emit('cardPaymentFailed', failureData)
    })

    this.cardReader.on('error', (error) => {
      console.error('Card reader error:', error)
      this.emit('cardReaderError', error)
    })
  }

  async initializeHardware() {
    console.log('Starting hardware initialization')
    if (this.isInitialized) {
      console.log('Hardware is already initialized')
      return { success: true }
    }

    const results = await Promise.all([
      this.initializeCoinAcceptor(),
      this.initializeBillAcceptor()
    ])

    this.isInitialized = results.some((result) => result.success)

    if (this.isInitialized) {
      console.log(
        'Hardware initialization completed. Some or all components successfully initialized.'
      )
      return { success: true }
    } else {
      const error = 'Failed to initialize any hardware component.'
      console.error(error)
      return { success: false, error }
    }
  }

  async initializeCoinAcceptor() {
    if (!this.config.coinAcceptor) {
      console.log('Coin acceptor not configured, skipping initialization')
      return { success: false }
    }

    try {
      console.log('Initializing coin acceptor...')
      this.coinAcceptor = new CoinAccepterHardware(this.config.coinAcceptor.port)
      await this.coinAcceptor.init()

      this.setupCoinAcceptorListeners()

      console.log('Coin acceptor successfully initialized')
      return { success: true }
    } catch (error) {
      console.error('Error initializing coin acceptor:', error)
      this.coinAcceptor = null
      this.emit('coinAcceptorError', {
        errorMessage: `Failed to initialize coin acceptor: ${error.message}`
      })
      return { success: false, error: error.message }
    }
  }

  setupCoinAcceptorListeners() {
    this.coinAcceptor.on('coin', (coinData) => {
      console.log(`Coin received: ${JSON.stringify(coinData)}`)
      this.totalAmount += coinData.CoinValue
      this.emit('coinInserted', coinData)
      this.emit('totalAmountChanged', this.totalAmount)
    })

    this.coinAcceptor.on('error', (error) => {
      console.error('Coin acceptor error:', error)
      this.emit('coinAcceptorError', error)
    })
  }

  async initializeBillAcceptor() {
    if (!this.config.billAcceptor) {
      console.log('Bill acceptor not configured, skipping initialization')
      return { success: false }
    }

    try {
      console.log('Initializing bill acceptor...')
      this.billAcceptor = new BillAcceptorHardware(this.config.billAcceptor.port)
      await this.billAcceptor.connectBillValidator()
      await this.billAcceptor.powerUpBillValidator()
      await this.billAcceptor.enableBillValidator()

      this.setupBillAcceptorListeners()

      console.log('Bill acceptor successfully initialized')
      return { success: true }
    } catch (error) {
      console.error('Error initializing bill acceptor:', error)
      this.billAcceptor = null
      this.emit('billAcceptorError', {
        errorMessage: `Failed to initialize bill acceptor: ${error.message}`
      })
      return { success: false, error: error.message }
    }
  }

  setupBillAcceptorListeners() {
    this.billAcceptor.on('billReceived', (billData) => {
      console.log(`Bill received: ${JSON.stringify(billData)}`)
      this.totalAmount += billData.value
      this.emit('billInserted', billData)
      this.emit('totalAmountChanged', this.totalAmount)
    })

    this.billAcceptor.on('billRejected', (rejectData) => {
      console.log(`Bill rejected: ${JSON.stringify(rejectData)}`)
      this.emit('billRejected', rejectData)
    })

    this.billAcceptor.on('error', (error) => {
      console.error('Bill acceptor error:', error)
      this.emit('billAcceptorError', error)
    })
  }

  activateHardware() {
    if (!this.isInitialized) {
      console.error('Hardware not initialized. Call initializeHardware first.')
      return { success: false, error: 'Hardware not initialized' }
    }

    if (this.isActive) {
      console.log('Hardware already active')
      return { success: true }
    }

    try {
      if (this.coinAcceptor) {
        this.coinAcceptor.startPoll()
        console.log('Coin acceptor started polling')
      }

      if (this.billAcceptor) {
        this.billAcceptor.enableBillValidator()
        this.billAcceptor.startListening()
        console.log('Bill acceptor enabled and started listening')
      }

      this.isActive = true
      console.log('All available hardware components activated')
      return { success: true }
    } catch (error) {
      console.error('Error activating hardware:', error)
      return { success: false, error: error.message }
    }
  }

  deactivateHardware() {
    if (!this.isActive) {
      console.log('Hardware already inactive')
      return { success: true }
    }

    try {
      if (this.coinAcceptor) {
        this.coinAcceptor.stopPoll()
        console.log('Coin acceptor stopped')
      }

      if (this.billAcceptor) {
        this.billAcceptor.stopListening()
        this.billAcceptor.disableBillValidator()
        console.log('Bill acceptor stopped and disabled')
      }

      this.isActive = false
      console.log('All hardware components deactivated')
      return { success: true }
    } catch (error) {
      console.error('Error deactivating hardware:', error)
      return { success: false, error: error.message }
    }
  }

  getTotalAmount() {
    return this.totalAmount
  }

  resetTotalAmount() {
    this.totalAmount = 0
    this.emit('totalAmountChanged', this.totalAmount)
    return { success: true }
  }

  async startCardSale(amount) {
    if (!this.isCardReaderInitialized) {
      console.error('Card reader not initialized')
      return { success: false, error: 'Card reader not initialized' }
    }

    try {
      const result = await this.cardReader.startSale(amount)
      return { success: true, result }
    } catch (error) {
      console.error('Error starting card sale:', error)
      this.emit('cardReaderError', { errorMessage: `Failed to start card sale: ${error.message}` })
      return { success: false, error: error.message }
    }
  }

  getCardReaderLastError() {
    if (!this.isCardReaderInitialized) {
      return 'Card reader not initialized'
    }
    return this.cardReader.getLastError()
  }

  async resetCardReader() {
    if (!this.isCardReaderInitialized) {
      console.error('Card reader not initialized')
      return { success: false, error: 'Card reader not initialized' }
    }

    try {
      await this.cardReader.reset()
      console.log('Card reader reset successfully')
      return { success: true }
    } catch (error) {
      console.error('Error resetting card reader:', error)
      this.emit('cardReaderError', {
        errorMessage: `Failed to reset card reader: ${error.message}`
      })
      return { success: false, error: error.message }
    }
  }

  async dispose() {
    console.log('Disposing of hardware resources...')
    try {
      await Promise.all([this.disposeCoinAcceptor(), this.disposeBillAcceptor()])

      this.isInitialized = false
      this.isActive = false
      this.totalAmount = 0
      // this.removeAllListeners();
      console.log('All hardware resources disposed')
      return { success: true }
    } catch (error) {
      console.error('Error disposing all hardware:', error)
      return { success: false, error: error.message }
    }
  }

  async disposeCoinAcceptor() {
    if (this.coinAcceptor) {
      try {
        await this.coinAcceptor.dispose()
        this.coinAcceptor = null
        console.log('Coin acceptor disposed')
        return { success: true }
      } catch (error) {
        console.error('Error disposing coin acceptor:', error)
        return { success: false, error: error.message }
      }
    }
  }

  async disposeBillAcceptor() {
    if (this.billAcceptor) {
      try {
        await this.billAcceptor.stopListening()
        await this.billAcceptor.disableBillValidator()
        this.billAcceptor.port.close()
        this.billAcceptor = null
        console.log('Bill acceptor disposed')
        return { success: true }
      } catch (error) {
        console.error('Error disposing bill acceptor:', error)
        return { success: false, error: error.message }
      }
    }
  }

  async disposeCardReader() {
    if (this.cardReader) {
      try {
        await this.cardReader.dispose()
        this.cardReader = null
        this.isCardReaderInitialized = false
        console.log('Card reader disposed')
        return { success: true }
      } catch (error) {
        console.error('Error disposing card reader:', error)
        return { success: false, error: error.message }
      }
    }
    this.isCardReaderInitialized = false
  }
}

export default HardwareManager
