import axios from 'axios';

let instance: any = null;

async function createAxiosInstance() {
  try {
    const response = await window.electronAPI.getConfig();
    const baseURL = response.parkomat.PARKOMAT_URL;

    instance = axios.create({
      baseURL: baseURL,
    });
  } catch (error) {
    console.error('Ошибка при получении baseURL:', error);
    // Используем резервный URL в случае ошибки
    instance = axios.create({
      baseURL: 'http://localhost:8080',
    });
  }
}

// Функция для получения экземпляра axios
export async function getAxiosInstance() {
  if (!instance) {
    await createAxiosInstance();
  }
  return instance;
}
