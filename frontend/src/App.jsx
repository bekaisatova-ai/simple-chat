import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

function App() {
  const [username, setUsername] = useState('')
  const [joined, setJoined] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (joined) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://192.168.1.205:3001'
      socketRef.current = io(backendUrl)
      
      socketRef.current.on('connect', () => {
        setConnected(true)
        socketRef.current.emit('join', username)
      })

      socketRef.current.on('history', (msgs) => {
        setMessages(msgs)
      })

      socketRef.current.on('message', (msg) => {
        setMessages(prev => [...prev, msg])
      })

      socketRef.current.on('disconnect', () => {
        setConnected(false)
      })

      return () => {
        socketRef.current.disconnect()
      }
    }
  }, [joined, username])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleJoin = (e) => {
    e.preventDefault()
    if (username.trim()) {
      setJoined(true)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (input.trim() && socketRef.current) {
      socketRef.current.emit('message', { text: input })
      setInput('')
    }
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            💬 Real-time Chat
          </h1>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите ваше имя"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              Войти в чат
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">💬 Chat</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">{username}</span>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto p-4 overflow-hidden flex flex-col max-w-4xl">
        <div className="flex-1 bg-white rounded-lg shadow-lg p-4 mb-4 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-3 ${msg.username === username ? 'text-right' : 'text-left'}`}
            >
              <div className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.username === username
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}>
                <div className="font-semibold text-sm mb-1">
                  {msg.username}
                </div>
                <div>{msg.text}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Введите сообщение..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
