import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button, Loader, Modal } from 'rsuite'
import HttpService from '../services/HttpService'
import { generateTransactionId } from '../utils/generateTransactionId'
import { Progress } from 'rsuite'
import CheckIcon from '@rsuite/icons/Check'
import { useTranslation } from 'react-i18next'

function Payment() {
  const { plateNumber, setBillingData, billingData, setErrorMessage, setShowErrorModal, config } =
    useOutletContext<OutletContextI>()

  const navigate = useNavigate()

  const { t } = useTranslation()

  const [isLoading, setIsLoading] = useState(true)

  const [isEnoughBalance, setIsEnoughBalance] = useState(false)

  const [showPayedModal, setShowPayedModal] = useState(false)

  const [percent, setPercent] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const checkBalanceIntervalRef = useRef<number | null>(null)

  const handleGoBack = () => {
    navigate('/')
  }

  const paymentTypes = [
    {
      title: t('cash'),
      value: 'Cash'
    },
    {
      title: t('card'),
      value: 'Card'
    }
  ]

  const handleError = (err: any) => {
    console.log(err)
    setErrorMessage(err?.response?.data?.message || 'Что-то пошло не так, попробуйте позже')
    setShowErrorModal(true)
  }

  const handleCloseEnoughModal = () => {
    navigate('/')
  }

  const handleContinueEnoughModal = () => {
    setIsEnoughBalance(false)
  }

  const fetchUserData = async (): Promise<BillingDataResponseI> => {
    return await new Promise((res, rej) =>
      HttpService.getBillingData({
        account: plateNumber,
        command: 'check',
        txn_id: generateTransactionId(),
        username: config.Parkomat || ''
      })
        .then((response) => {
          setBillingData(response)
          res(response)
          if (response?.current_balance >= response?.sum) setIsEnoughBalance(true)
        })
        .catch(handleError)
        .finally(() => {
          setIsLoading(false)
        })
    )
  }

  const handlePaymentType = (type: string) => {
    switch (type) {
      case 'Card': {
        navigate('/card')
        break
      }
      case 'Cash': {
        navigate('/cash')
        break
      }
      default: {
      }
    }
  }

  const checkBalance = async (prevData: BillingDataResponseI) => {
    try {
      const res = await HttpService.getBillingData({
        account: plateNumber,
        command: 'check',
        txn_id: generateTransactionId(),
        username: config.Parkomat || ''
      })
      if (prevData?.current_balance < res?.current_balance && res?.current_balance >= res?.sum) {
        setShowPayedModal(true)
        resetTimer()
      }
    } catch (error) {
      console.log(error)
    }
  }
  const startTimer = (data: BillingDataResponseI) => {
    if (intervalRef.current !== null) return // Предотвращаем повторный запуск таймера

    intervalRef.current = window.setInterval(() => {
      setPercent((prevPercent) => {
        if (prevPercent >= 100) {
          resetTimer()
          navigate('/')
          return 100
        }
        return prevPercent + 100 / 180
      })
    }, 1000)

    checkBalanceIntervalRef.current = window.setInterval(() => checkBalance(data), 10000)
  }

  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (checkBalanceIntervalRef.current) {
      clearInterval(checkBalanceIntervalRef.current)
      checkBalanceIntervalRef.current = null
    }
  }

  const handleClose = () => {
    navigate('/')
  }

  useEffect(() => {
    fetchUserData().then(startTimer)
    return resetTimer
  }, [])

  if (isLoading) return <Loader />

  return (
    <div className="w-full">
      <Modal backdrop={true} open={showPayedModal} onClose={handleClose}>
        <Modal.Body
          style={{
            display: 'flex',
            gap: '14px',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '34px'
          }}
        >
          {t('paymentSucced')}
          <CheckIcon style={{ fontSize: '64px' }} color="green" />
        </Modal.Body>
      </Modal>

      <Modal backdrop={true} open={isEnoughBalance}>
        <Modal.Body
          style={{
            display: 'flex',
            gap: '14px',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '34px'
          }}
        >
          <div className="text-center">{t('balanceEnough')}</div>
          <div className="text-center">{t('preferContinue')}</div>
          <div className="flex gap-9">
            <Button color="orange" appearance="primary" size="lg" onClick={handleCloseEnoughModal}>
              {t('close')}
            </Button>
            <Button appearance="primary" size="lg" onClick={handleContinueEnoughModal}>
              {t('continue')}
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      <Progress.Line
        strokeColor="#3b82f6"
        percent={percent}
        strokeWidth={4}
        trailWidth={4}
        showInfo={false}
      />

      <Button onClick={handleGoBack} color="orange" appearance="primary" className="mt-2" size="lg">
        ← {t('back')}
      </Button>
      <div className="flex justify-between mt-8">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div className="text-3xl flex">{t('plateNumber')}:</div>
            <div className="text-4xl font-semibold">{plateNumber}</div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-3xl flex">{t('forCurrentSession')}:</div>
            <div className="text-4xl font-semibold">{billingData?.sum}</div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-3xl flex">{t('currentBalance')}:</div>
            <div className="text-4xl font-semibold">{billingData?.current_balance}</div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-3xl flex">{t('payAmount')}:</div>
            <div className="text-4xl font-semibold">{billingData?.sum}</div>
          </div>
        </div>
        <div>
          <div className="text-center">{t('choosePayMethod')}</div>
          <div>
            <div className="text-center text-red-600 font-semibold text-2xl">KaspiQr</div>
            <QRCode value={billingData?.kaspiQr || ''} className="mt-2" />
          </div>
          <div className="flex flex-wrap mt-4 justify-between">
            {paymentTypes.map((paymentType) => (
              <Button
                key={paymentType.value}
                onClick={() => handlePaymentType(paymentType.value)}
                appearance="primary"
                size="lg"
              >
                {paymentType.title}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payment
