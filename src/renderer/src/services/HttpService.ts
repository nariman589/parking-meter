import axios, { AxiosInstance } from 'axios'
import { serviceUri } from './uri'
import { jsToFormData } from '../utils/jsToFormData'
import { getAxiosInstance } from './axiosInstance'

class HttpService {
  private static httpClient: AxiosInstance | null = null

  private static async initHttpClient() {
    if (!this.httpClient) {
      this.httpClient = await getAxiosInstance()
    }
  }
  public static getCheckNumber = async (data: CheckNumberI): Promise<PaymentResponseI> => {
    await this.initHttpClient()
    const response = await this.httpClient!.post(serviceUri.getBillDataUri, jsToFormData(data))
    return response.data
  }
  public static getBillingData = async (data: BillingDataI): Promise<BillingDataResponseI> => {
    await this.initHttpClient()
    const response = await this.httpClient!.post(serviceUri.getBillDataUri, jsToFormData(data))
    return response.data
  }
  public static doPay = async (data: PayI): Promise<PaymentResponseI> => {
    await this.initHttpClient()
    const response = await this.httpClient!.post(serviceUri.getBillDataUri, jsToFormData(data))
    return response.data
  }
  public static print_check = async (data: PrintCheckI): Promise<PaymentResponseI> => {
    await this.initHttpClient()
    const response = await this.httpClient!.post(serviceUri.getBillDataUri, jsToFormData(data))
    return response.data
  }
  public static tryToLeave = async (data: TryToLeaveI): Promise<PaymentResponseI> => {
    await this.initHttpClient()
    const response = await this.httpClient!.post(serviceUri.TryLeavingUri, jsToFormData(data))
    return response.data
  }
  public static getListOfLastCars = async (data: LastInCarsI): Promise<PaymentResponseI> => {
    await this.initHttpClient()
    const response = await this.httpClient!.post(serviceUri.LastInCarsUri, jsToFormData(data))
    return response.data
  }
}

export default HttpService
