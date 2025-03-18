import { useState } from 'react'
import TelegramLogin from './components/login'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <TelegramLogin />
    </>
  )
}

export default App
