// popup/main.tsx  –  팝업 진입점
// 클릭 시 사이드패널을 열어주는 간단한 런처
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from './PopupApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
)
