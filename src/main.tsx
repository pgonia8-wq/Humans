import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { MiniKit } from '@worldcoin/minikit-js';

const Root = () => {
  useEffect(() => {
    const initMiniKit = () => {
      MiniKit.install();
      console.log('MiniKit instalado:', MiniKit.isInstalled());
      if (MiniKit.isInstalled()) {
        console.log('¡BRIDGE ACTIVO! Estás dentro de World App');
      }
    };

    initMiniKit();

    // Retry después de 2 segundos (fix común de timing en World App)
    const retryTimer = setTimeout(initMiniKit, 2000);

    return () => clearTimeout(retryTimer);
  }, []);

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
