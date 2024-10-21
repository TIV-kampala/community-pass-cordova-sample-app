import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));


if (window.cordova) {
  document.addEventListener('deviceready', () => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }, false);
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

