import React, { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import NavBar from './Navbar'
import MainForm from '../pages/MainForm'
import { Loader, Modal } from 'rsuite'
import CloseOutlineIcon from '@rsuite/icons/CloseOutline'

function Layout() {
  const location = useLocation()
  const [plateNumber, setPlateNumber] = useState('444LJ55')
  const [billingData, setBillingData] = useState<BillingDataResponseI>()

  const [loading, setLoading] = useState(true)

  const [config, setConfig] = useState<ConfigI>()

  const navigate = useNavigate()

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleClose = () => {
    setErrorMessage('')
    setShowErrorModal(false)
    navigate('/')
  }

  const getConfig = async () => {
    try {
      setLoading(true)
      const config = await window.electronAPI.getConfig()
      setConfig(config.parkomat)
      setLoading(false)
    } catch (e) {
      console.log(e)
    }
  }

  useEffect(() => {
    getConfig()
  }, [])

  if (loading) return <Loader />

  return (
    <div className="mx-auto max-w-4xl h-screen ">
      <NavBar config={config} />
      <div className="flex-col flex h-2/3 justify-center items-center">
        <Modal backdrop={true} open={showErrorModal} onClose={handleClose}>
          <Modal.Body
            style={{
              display: 'flex',
              gap: '14px',
              flexDirection: 'column',
              alignItems: 'center',
              fontSize: '24px'
            }}
          >
            {errorMessage}
            <CloseOutlineIcon style={{ fontSize: '64px' }} color="red" />
          </Modal.Body>
        </Modal>
        {location.pathname === '/' ? (
          <MainForm
            plateNumberState={{
              plateNumber,
              setPlateNumber
            }}
          />
        ) : (
          <Outlet
            context={{
              plateNumber,
              billingData,
              setBillingData,
              setShowErrorModal,
              setErrorMessage,
              config
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Layout
