import { useEffect, useState } from 'react'

type Health = { status: string }

function App() {
  const [api, setApi] = useState<string>('…')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json() as Promise<Health>)
      .then((data) => setApi(data.status))
      .catch(() => setApi('injoignable'))
  }, [])

  return (
    <main>
      <h1>FamilyFrame</h1>
      <p>API : {api}</p>
    </main>
  )
}

export default App
