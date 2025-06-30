export interface CoinData {
  CoinName: string;
  CoinValue: number;
  CoinCode: number;
  SorterPath: number;
}

export interface BillData {
  value: number;
  status: string;
}

export interface CoinAcceptorError {
  errorCode?: string | number;
  errorMessage: string;
}

export interface BillAcceptorError {
  errorCode?: string | number;
  errorMessage: string;
}

export interface CardReaderError {
  errorCode?: string | number;
  errorMessage: string;
}

export interface HardwareOperationResult {
  success: boolean;
  error?: string;
}

export interface CardPaymentData {
  amount: number;
  transactionId?: string;
  cardType?: string;
  last4Digits?: string;
}

export interface ElectronAPI {
  getConfig: () => Promise<any>;
  initAndActivate: () => Promise<HardwareOperationResult>;
  initializeHardware: () => Promise<HardwareOperationResult>;
  activateHardware: () => Promise<HardwareOperationResult>;
  deactivateHardware: () => Promise<HardwareOperationResult>;
  getTotalAmount: () => Promise<number>;
  resetTotalAmount: () => Promise<HardwareOperationResult>;
  getBillAcceptorStatus: () => Promise<string | null>;
  onCoinInserted: (
    callback: (event: Electron.IpcRendererEvent, coinData: CoinData) => void
  ) => void;
  onCoinAcceptorError: (
    callback: (
      event: Electron.IpcRendererEvent,
      error: CoinAcceptorError
    ) => void
  ) => void;
  onBillInserted: (
    callback: (event: Electron.IpcRendererEvent, billData: BillData) => void
  ) => void;
  onBillRejected: (
    callback: (event: Electron.IpcRendererEvent, rejectData: any) => void
  ) => void;
  onBillAcceptorError: (
    callback: (
      event: Electron.IpcRendererEvent,
      error: BillAcceptorError
    ) => void
  ) => void;
  onTotalAmountChanged: (
    callback: (event: Electron.IpcRendererEvent, totalAmount: number) => void
  ) => void;
  removeAllListeners: (channel: string) => void;
  disposeAll: () => Promise<HardwareOperationResult>;
  disposeBillAcceptor: () => Promise<HardwareOperationResult>;
  disposeCoinAcceptor: () => Promise<HardwareOperationResult>;
  disposeCardReader: () => Promise<HardwareOperationResult>;

  // New methods for card reader operations
  initializeCardReader: () => Promise<HardwareOperationResult>;
  startCardSale: (amount: number) => Promise<HardwareOperationResult>;
  getCardReaderLastError: () => Promise<string | null>;
  resetCardReader: () => Promise<HardwareOperationResult>;
  onCardPaymentSuccess: (
    callback: (
      event: Electron.IpcRendererEvent,
      paymentData: CardPaymentData
    ) => void
  ) => void;
  onCardPaymentFailed: (
    callback: (event: Electron.IpcRendererEvent, failureData: any) => void
  ) => void;
  onCardReaderError: (
    callback: (event: Electron.IpcRendererEvent, error: CardReaderError) => void
  ) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
