import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from './PopupApp.tsx';
import './popup.css';

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <PopupApp />
        </StrictMode>
    );
}
