import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../Design/index.css'
import App from './App'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from '../../Context/Context'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
  </StrictMode>,
)
