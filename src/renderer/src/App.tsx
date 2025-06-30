import React from 'react'
import './index.css'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { I18nextProvider } from 'react-i18next'
import i18n from './locale/i18n'
import Payment from './pages/Payment'
import Card from './pages/Card'
import Cash from './pages/Cash'
import { HardwareProvider } from './contexts/HardwareContext'
import 'rsuite/dist/rsuite.min.css'
import Payed from './pages/Payed'

function App() {
  return (
    <>
      <I18nextProvider i18n={i18n}>
        <HardwareProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route path="payment" element={<Payment />} />
                <Route path="card" element={<Card />} />
                <Route path="cash" element={<Cash />} />
                <Route path="payed" element={<Payed />} />
              </Route>
            </Routes>
          </HashRouter>
        </HardwareProvider>
      </I18nextProvider>
    </>
  )
}

export default App
