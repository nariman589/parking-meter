const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  initAndActivate: () => ipcRenderer.invoke('initialize-and-activate-hardware'),
  initializeHardware: () => ipcRenderer.invoke('initialize-hardware'),
  activateHardware: () => ipcRenderer.invoke('activate-hardware'),
  deactivateHardware: () => ipcRenderer.invoke('deactivate-hardware'),
  getBillAcceptorStatus: () => ipcRenderer.invoke('get-bill-acceptor-status'),
  getTotalAmount: () => ipcRenderer.invoke('get-total-amount'),
  resetTotalAmount: () => ipcRenderer.invoke('reset-total-amount'),
  onCoinInserted: (callback) => ipcRenderer.on('coin-inserted', callback),
  onCoinAcceptorError: (callback) => ipcRenderer.on('coin-acceptor-error', callback),
  onBillInserted: (callback) => ipcRenderer.on('bill-inserted', callback),
  onBillRejected: (callback) => ipcRenderer.on('bill-rejected', callback),
  onBillAcceptorError: (callback) => ipcRenderer.on('bill-acceptor-error', callback),
  onTotalAmountChanged: (callback) => ipcRenderer.on('total-amount-changed', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  disposeAll: () => ipcRenderer.invoke('dispose-all'),
  disposeBillAcceptor: () => ipcRenderer.invoke('dispose-bill-acceptor'),
  disposeCoinAcceptor: () => ipcRenderer.invoke('dispose-coin-acceptor'),
  disposeCardReader: () => ipcRenderer.invoke('dispose-card-reader'),

  // New methods for card reader operations
  initializeCardReader: () => ipcRenderer.invoke('initialize-card-reader'),
  startCardSale: (amount) => ipcRenderer.invoke('start-card-sale', amount),
  getCardReaderLastError: () => ipcRenderer.invoke('get-card-reader-last-error'),
  resetCardReader: () => ipcRenderer.invoke('reset-card-reader'),
  onCardPaymentSuccess: (callback) => ipcRenderer.on('card-payment-success', callback),
  onCardPaymentFailed: (callback) => ipcRenderer.on('card-payment-failed', callback),
  onCardReaderError: (callback) => ipcRenderer.on('card-reader-error', callback)
})
