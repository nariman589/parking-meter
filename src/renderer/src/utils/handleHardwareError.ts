export const handleHardwareError = (err: any) => {
  console.error('Hardware initialization error:', err);
  let errorMessage =
    'Произошла неизвестная ошибка при инициализации оборудования.';

  if (typeof err === 'string') {
    errorMessage = err;
  } else if (err instanceof Error) {
    errorMessage = err.message;
  } else if (err && typeof err === 'object' && 'message' in err) {
    errorMessage = err.message;
  }

  // Специальная обработка для ошибки отсутствия coinAcceptor
  if (
    errorMessage.includes(
      "Cannot read properties of undefined (reading 'coinAcceptor')"
    )
  ) {
    errorMessage =
      'Ошибка инициализации монетоприемника. Проверьте подключение и конфигурацию.';
  }

  return errorMessage;
};
