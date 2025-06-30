import fs from 'fs'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { print } from 'pdf-to-printer'
import path from 'path'

// Mock data for Properties.Settings
const Properties = {
  Settings: {
    companyName: 'ParkSmart Ltd.',
    certificateNDS: 'VAT Certificate: 123456789',
    BIN: '987654321',
    KGD_RNM: 'KGD123456',
    NumberKassa: 'KS987654',
    objectName: 'Central City Parking',
    address: '123 Main St, Metropolis',
    Parkomat: 'PM-001',
    TarriffDescForBill: '100 тг/hour',
    BarCodeOffset: 500,
    CustomBillMessageKz: 'Рақмет! Қайта келіңіз!',
    CustomBillMessageEn: 'Thank you! Come again!',
    CustomBillMessage: 'Спасибо! Приходите еще!'
  }
}

// Mock data for Resources.PaymentReceiptMessages
const Resources = {
  PaymentReceiptMessages: {
    Receipt: 'Квитанция',
    ParkingName: 'Парковка',
    PaidParkingServices: 'Услуги платной парковки',
    Rate: 'Тариф',
    ParkomatName: 'Паркомат',
    CheckInTime: 'Время заезда',
    CarNumber: 'Номер автомобиля',
    PayForXHourUntil: 'Оплачено на %hour% ч. до %untilDateTime%',
    PaymentTime: 'Время оплаты',
    Paid: 'Оплачено',
    Received: 'Получено',
    Debt: 'Долг',
    Change: 'Сдача',
    InclVAT: 'в т.ч. НДС',
    FiscalReceipt: 'Фискальный чек',
    FiscalDataOperator: 'Оператор фискальных данных',
    ToCheckYourReceiptGoToTheWebsite: 'Для проверки чека зайдите на сайт',
    YouHave15minuteToCheckOut: 'У вас есть 15 минут на выезд',
    RemainderWasCreditedToCarBalance: 'Остаток %amount% тг. зачислен на баланс а/м %carNumber%',
    WillBeUsedTowardYourNextParkingFee: 'и будет использован при следующей оплате парковки',
    QrCodeTemporarilyUnavailable: 'QR-код временно недоступен'
  }
}

class PrintCheck {
  constructor() {
    this.CustomBillMessageMaxLength = 45
    this.outputPath = path.join(process.cwd(), 'parking_receipt.pdf')
  }

  async print(state) {
    const doc = new PDFDocument({ size: 'A4', margin: 10 })
    const writeStream = fs.createWriteStream(this.outputPath)
    doc.pipe(writeStream)

    try {
      await this.generateContent(doc, state)
    } catch (ex) {
      console.error(`Error when generating bill content - ${ex.message}`)
      console.error(ex.stack)
    }

    doc.end()

    writeStream.on('finish', () => {
      this.sendToPrinter()
    })
  }

  async sendToPrinter() {
    try {
      console.log(this.outputPath)
      await print(this.outputPath)
      console.log('Printing job sent successfully')
    } catch (error) {
      console.error('Error sending print job:', error)
    } finally {
      // Опционально: удалить временный PDF-файл
      // fs.unlink(this.outputPath, (err) => {
      //   if (err) console.error('Error deleting temporary PDF:', err)
      // })
    }
  }

  async generateContent(doc, state) {
    const {
      CheckNumber = '',
      PaySum,
      ReceivedSum,
      Change,
      Account,
      in_date,
      hours,
      payed_till,
      TransactionModel,
      qr_url
    } = state
    const result = state.getResult() === 'success' ? 'Успех' : 'Диспут'
    const hoursCount = Math.floor(PaySum / 100)
    const nds = Math.round(((PaySum * 12) / 112) * 100) / 100

    doc.font('Helvetica').fontSize(10)

    const printLine = (text) => doc.text(text)

    if (Properties.Settings.companyName) {
      printLine(Properties.Settings.companyName)
    }
    if (Properties.Settings.certificateNDS) {
      printLine(Properties.Settings.certificateNDS)
    }

    printLine(`БИН: ${Properties.Settings.BIN}`)
    printLine(`РНМ: ${Properties.Settings.KGD_RNM}`)
    printLine(`ЗНК: ${Properties.Settings.NumberKassa}`)
    printLine('********************************************')
    printLine(`              ${Resources.PaymentReceiptMessages.Receipt} №${TransactionModel.Id}`)
    printLine(`${Resources.PaymentReceiptMessages.ParkingName}: ${Properties.Settings.objectName}`)
    printLine(Properties.Settings.address)
    printLine(`"${Resources.PaymentReceiptMessages.PaidParkingServices}"`)
    printLine(`${Resources.PaymentReceiptMessages.Rate}: ${Properties.Settings.TarriffDescForBill}`)
    printLine(`${Resources.PaymentReceiptMessages.ParkomatName}: ${Properties.Settings.Parkomat}`)
    printLine(`${Resources.PaymentReceiptMessages.CheckInTime}: ${in_date}`)
    printLine(`${Resources.PaymentReceiptMessages.CarNumber}: ${Account}`)
    printLine(
      `${Resources.PaymentReceiptMessages.PayForXHourUntil.replace('%hour%', hours.toString()).replace('%untilDateTime%', payed_till)}`
    )
    printLine(`${Resources.PaymentReceiptMessages.PaymentTime}: ${new Date().toLocaleString()}`)
    printLine(
      `${Resources.PaymentReceiptMessages.Paid}:                    ${ReceivedSum - Change} тг.`
    )
    printLine(
      `${Resources.PaymentReceiptMessages.Received}:                       ${ReceivedSum} тг.`
    )
    printLine(
      `${Resources.PaymentReceiptMessages.Debt}:             ${PaySum - (ReceivedSum - Change)} тг.`
    )

    if (Change > 0 && !state.change_sended) {
      printLine(
        `${Resources.PaymentReceiptMessages.RemainderWasCreditedToCarBalance.replace('%amount%', Change.toString()).replace('%carNumber%', Account)}`
      )
      printLine(Resources.PaymentReceiptMessages.WillBeUsedTowardYourNextParkingFee)
    } else {
      printLine(
        `${Resources.PaymentReceiptMessages.Change}:                           ${Change} тг.`
      )
    }

    printLine(`${Resources.PaymentReceiptMessages.InclVAT} 12% : ${nds} тг.`)
    printLine('')
    printLine(`${Resources.PaymentReceiptMessages.FiscalReceipt} №${CheckNumber}`)
    printLine(`${Resources.PaymentReceiptMessages.FiscalDataOperator} АО "Казахтелеком"`)
    printLine(`${Resources.PaymentReceiptMessages.ToCheckYourReceiptGoToTheWebsite}:`)
    printLine('http://consumer.oofd.kz')
    printLine('')
    printLine(`         ${Resources.PaymentReceiptMessages.YouHave15minuteToCheckOut}!`)

    let ofdQrOffsetY = Properties.Settings.BarCodeOffset

    const currentCulture = process.env.LANG?.split('_')[0] || 'en'

    const customMessageMap = {
      kk: Properties.Settings.CustomBillMessageKz,
      en: Properties.Settings.CustomBillMessageEn,
      default: Properties.Settings.CustomBillMessage
    }

    const customMessage = customMessageMap[currentCulture] || customMessageMap.default
    if (customMessage) {
      printLine(this.formatCustomBillMessage(customMessage))
      ofdQrOffsetY += 40
    }

    printLine('********************************************')
    printLine(
      `             ${Resources.PaymentReceiptMessages.FiscalReceipt} ФП - WEBKASSA.KZ      \n \n`
    )

    if (!qr_url && !CheckNumber) {
      console.error(
        'Не получен параметр qr_url и checkNumber от бэк-системы, генерация QR кода ОФД недоступна!!!'
      )
      printLine(
        `         ${Resources.PaymentReceiptMessages.QrCodeTemporarilyUnavailable}!!!  \n \n \n`
      )
    } else {
      const printValue = qr_url || CheckNumber
      if (printValue) {
        const qrCodeDataUrl = await QRCode.toDataURL(printValue)
        doc.image(qrCodeDataUrl, 85, ofdQrOffsetY, { width: 100, height: 100 })
      }
    }
  }

  formatCustomBillMessage(customBillMessage) {
    if (customBillMessage.length <= this.CustomBillMessageMaxLength) {
      return `${customBillMessage}\n`
    }

    const words = customBillMessage.split(' ')
    const maxLineForBillCustomMessage = 2
    let billCustomMessage = ''
    let currentLine = ''
    let lineCount = 0

    for (const word of words) {
      if ((currentLine + word).length > this.CustomBillMessageMaxLength) {
        billCustomMessage += `${currentLine.trim()}\n`
        currentLine = ''
        lineCount++

        if (lineCount >= maxLineForBillCustomMessage) {
          break
        }
      }
      currentLine += `${word} `
    }

    return `${billCustomMessage}${currentLine.trim()}\n`
  }
}

export default PrintCheck
