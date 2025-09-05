import React, { useEffect, useState } from 'react';

const DebugConfig = () => {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    setConfig({
      REACT_APP_API_URL: process.env.REACT_APP_API_URL,
      NODE_ENV: process.env.NODE_ENV,
      currentURL: window.location.href,
      timestamp: new Date().toISOString()
    });
  }, []);

  if (!config) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'black', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <strong>Debug Config:</strong>
      <br />
      API URL: {config.REACT_APP_API_URL || 'NOT SET'}
      <br />
      Environment: {config.NODE_ENV}
      <br />
      Current URL: {config.currentURL}
    </div>
  );
};

export default DebugConfig;
