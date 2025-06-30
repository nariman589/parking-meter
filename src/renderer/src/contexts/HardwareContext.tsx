import React, { createContext, useContext, useEffect, useState } from 'react';
import { CardPaymentData, CardReaderError } from '../interfaces/electron';

interface HardwareContextType {
  hardwareStatus:
    | 'not initialized'
    | 'active'
    | 'initialized'
    | 'card reader initialized';
  error: string | null;
  totalAmount: number;
  initAndActivateHardware: () => Promise<void>;
  deactivateHardware: () => Promise<void>;
  initializeCardReader: () => Promise<void>;
  startCardSale: (amount: number) => Promise<boolean>;
  cardReaderLastError: string | null;
  disposeCardReader: () => Promise<true | undefined>;
  disposeAll: () => Promise<true | undefined>;
  disposeBillAcceptor: () => Promise<true | undefined>;
  disposeCoinAcceptor: () => Promise<true | undefined>;
  setTotalAmount: React.Dispatch<React.SetStateAction<number>>;
  cardReaderPayedStatus: 'payed' | 'not payed' | 'waiting';
  setCardReaderPayedStatus: React.Dispatch<
    React.SetStateAction<'payed' | 'not payed' | 'waiting'>
  >;
  clearErrors: () => void;
}

const HardwareContext = createContext<HardwareContextType | undefined>(
  undefined
);

export const useHardware = () => {
  const context = useContext(HardwareContext);
  if (context === undefined) {
    throw new Error('useHardware must be used within a HardwareProvider');
  }
  return context;
};

export const HardwareProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [hardwareStatus, setHardwareStatus] = useState<
    'not initialized' | 'active' | 'initialized' | 'card reader initialized'
  >('not initialized');
  const [error, setError] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [cardReaderLastError, setCardReaderLastError] = useState<string | null>(
    null
  );
  const [cardReaderPayedStatus, setCardReaderPayedStatus] = useState<
    'payed' | 'not payed' | 'waiting'
  >('waiting');

  const initAndActivateHardware = async () => {
    try {
      const result = await window.electronAPI.initAndActivate();
      if (result.success) {
        setHardwareStatus('active');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deactivateHardware = async () => {
    try {
      const result = await window.electronAPI.deactivateHardware();
      if (result.success) {
        setHardwareStatus('initialized');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const disposeAll = async () => {
    try {
      const result = await window.electronAPI.disposeAll();
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  const disposeCoinAcceptor = async () => {
    try {
      const result = await window.electronAPI.disposeCoinAcceptor();
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  const disposeBillAcceptor = async () => {
    try {
      const result = await window.electronAPI.disposeBillAcceptor();
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  const disposeCardReader = async () => {
    try {
      const result = await window.electronAPI.disposeCardReader();
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const initializeCardReader = async () => {
    try {
      const result = await window.electronAPI.initializeCardReader();
      if (result.success) {
        setHardwareStatus('card reader initialized');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const startCardSale = async (amount: number): Promise<boolean> => {
    try {
      setCardReaderPayedStatus('waiting');
      const result = await window.electronAPI.startCardSale(amount);
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  useEffect(() => {
    const handleTotalAmountChanged = (
      _event: Electron.IpcRendererEvent,
      newTotal: number
    ) => {
      setTotalAmount(newTotal);
    };

    const handleCardPaymentSuccess = (
      _event: Electron.IpcRendererEvent,
      paymentData: CardPaymentData
    ) => {
      console.log('Оплата картой успешна:', paymentData);
      setCardReaderPayedStatus('payed');
    };

    const handleCardPaymentFailed = (
      _event: Electron.IpcRendererEvent,
      failureData: any
    ) => {
      console.log('Оплата картой не удалась:', failureData);
      setCardReaderPayedStatus('not payed');
      setError(
        `Ошибка оплаты картой: ${failureData.message || 'Неизвестная ошибка'}`
      );
    };

    const handleCardReaderError = (
      _event: Electron.IpcRendererEvent,
      error: CardReaderError
    ) => {
      console.error('Ошибка кардридера:', error);
      setCardReaderLastError(error.errorMessage);
    };

    window.electronAPI.onTotalAmountChanged(handleTotalAmountChanged);
    window.electronAPI.onCardPaymentSuccess(handleCardPaymentSuccess);
    window.electronAPI.onCardPaymentFailed(handleCardPaymentFailed);
    window.electronAPI.onCardReaderError(handleCardReaderError);

    return () => {
      window.electronAPI.removeAllListeners('total-amount-changed');
      window.electronAPI.removeAllListeners('card-payment-success');
      window.electronAPI.removeAllListeners('card-payment-failed');
      window.electronAPI.removeAllListeners('card-reader-error');
    };
  }, [disposeAll]);

  const clearErrors = () => {
    setError(null);
    setCardReaderLastError(null);
    setCardReaderPayedStatus('waiting');
  };

  return (
    <HardwareContext.Provider
      value={{
        hardwareStatus,
        error,
        totalAmount,
        initAndActivateHardware,
        deactivateHardware,
        initializeCardReader,
        startCardSale,
        cardReaderLastError,
        disposeCardReader,
        disposeAll,
        disposeBillAcceptor,
        disposeCoinAcceptor,
        setTotalAmount,
        cardReaderPayedStatus,
        setCardReaderPayedStatus,
        clearErrors,
      }}
    >
      {children}
    </HardwareContext.Provider>
  );
};
