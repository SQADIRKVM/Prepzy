import { useState, useCallback } from 'react';
import { AlertButton } from '../components/CustomAlert';

interface AlertConfig {
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  buttons?: AlertButton[];
}

export function useAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertConfig(config);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setAlertConfig(null);
    }, 300);
  }, []);

  return {
    alertConfig,
    visible,
    showAlert,
    hideAlert,
  };
}
