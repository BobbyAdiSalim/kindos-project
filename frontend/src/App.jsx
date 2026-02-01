import { useState } from 'react'
import './App.css'

function App() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    const endpoint = isLogin ? '/users/token' : '/users'
    const url = `/api${endpoint}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.response)
        setToken(data.token)
        setIsLoggedIn(true)
      } else {
        setMessage(data.error || 'An error occurred')
      }
    } catch (error) {
      setMessage('Failed to connect to server')
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setToken('')
    setUsername('')
    setPassword('')
    setMessage('')
  }

  if (isLoggedIn) {
    return (
      <div className="container">
        <div className="success-message">
          <h2>Logged In Successfully</h2>
          <p>Welcome, {username}!</p>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="auth-box">
        <h1>{isLogin ? 'Login' : 'Sign Up'}</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="submit-btn">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        {message && (
          <div className={`message ${isLoggedIn ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            className="toggle-link" 
            onClick={() => {
              setIsLogin(!isLogin)
              setMessage('')
            }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default App
