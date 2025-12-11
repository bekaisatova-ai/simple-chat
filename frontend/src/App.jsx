import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

function App() {
  const [username, setUsername] = useState('')
  const [joined, setJoined] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

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

      socketRef.current.on('online-users', (users) => {
        setOnlineUsers(users)
      })

      socketRef.current.on('typing', (users) => {
        setTypingUsers(users.filter(u => u !== username))
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

  const handleInputChange = (e) => {
    setInput(e.target.value)

    if (socketRef.current) {
      socketRef.current.emit('typing', true)

      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('typing', false)
      }, 1000)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (input.trim() && socketRef.current) {
      socketRef.current.emit('message', { text: input })
      socketRef.current.emit('typing', false)
      setInput('')
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform hover:scale-105 transition-transform duration-300">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce">💬</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              ChatRoom
            </h1>
            <p className="text-gray-500">Присоединяйтесь к беседе</p>
          </div>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите ваше имя"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 mb-4 transition-colors"
              autoFocus
              maxLength={20}
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105"
            >
              Войти в чат
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-3xl">💬</div>
            <div>
              <h1 className="text-2xl font-bold">ChatRoom</h1>
              <p className="text-xs text-indigo-200">{onlineUsers.length} пользователей онлайн</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{username}</span>
            <div className={`w-3 h-3 rounded-full animate-pulse ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          </div>
        </div>
      </div>

      <div className="container mx-auto p-2 md:p-4 flex flex-col-reverse md:flex-row gap-2 md:gap-4 h-[calc(100vh-80px)]">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-3 md:p-6 mb-2 md:mb-4 overflow-y-auto">
            {messages.map((msg, index) => {
              const isOwn = msg.username === username
              const showAvatar = index === 0 || messages[index - 1].username !== msg.username

              return (
                <div
                  key={msg._id || msg.id}
                  className={`mb-2 md:mb-4 flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  {!isOwn && showAvatar && (
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full ${msg.avatar} flex items-center justify-center text-white font-bold mr-1 md:mr-2 flex-shrink-0 text-xs md:text-sm`}>
                      {msg.username[0].toUpperCase()}
                    </div>
                  )}
                  {!isOwn && !showAvatar && <div className="w-6 md:w-8 mr-1 md:mr-2" />}

                  <div className={`max-w-[75%] md:max-w-xs lg:max-w-md`}>
                    {showAvatar && (
                      <div className={`text-xs font-semibold mb-1 ${isOwn ? 'text-right' : 'text-left'} text-gray-600`}>
                        {msg.username}
                      </div>
                    )}
                    <div className={`px-3 py-2 md:px-4 md:py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    } shadow-md`}>
                      <div className="break-words text-sm md:text-base">{msg.text}</div>
                      <div className={`text-xs mt-1 ${isOwn ? 'text-purple-100' : 'text-gray-500'}`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>

                  {isOwn && showAvatar && (
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full ${msg.avatar} flex items-center justify-center text-white font-bold ml-1 md:ml-2 flex-shrink-0 text-xs md:text-sm`}>
                      {msg.username[0].toUpperCase()}
                    </div>
                  )}
                  {isOwn && !showAvatar && <div className="w-6 md:w-8 ml-1 md:ml-2" />}
                </div>
              )
            })}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-gray-500 text-sm animate-fadeIn">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{typingUsers.join(', ')} печатает...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="flex gap-2 md:gap-3">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Сообщение..."
              className="flex-1 px-4 md:px-6 py-3 md:py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 transition-colors shadow-md text-sm md:text-base"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 md:py-4 px-4 md:px-8 rounded-2xl transition duration-200 transform hover:scale-105 disabled:transform-none shadow-md text-sm md:text-base"
            >
              <span className="hidden md:inline">Отправить</span>
              <span className="md:hidden">➤</span>
            </button>
          </form>
        </div>

        {/* Online Users Sidebar */}
        <div className="md:w-64 bg-white rounded-2xl shadow-xl p-3 md:p-6 overflow-x-auto md:overflow-y-auto">
          <h2 className="text-sm md:text-lg font-bold text-gray-800 mb-2 md:mb-4 flex items-center gap-2">
            <span className="text-xl md:text-2xl">👥</span>
            <span className="hidden md:inline">Онлайн ({onlineUsers.length})</span>
            <span className="md:hidden">{onlineUsers.length}</span>
          </h2>
          <div className="flex md:flex-col gap-2 md:gap-3 md:space-y-0">
            {onlineUsers.map((user, index) => (
              <div
                key={index}
                className="flex md:flex-row items-center gap-2 md:gap-3 p-1 md:p-2 rounded-lg hover:bg-gray-50 transition-colors animate-fadeIn flex-shrink-0"
              >
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${user.avatar} flex items-center justify-center text-white font-bold shadow-md text-xs md:text-base`}>
                  {user.username[0].toUpperCase()}
                </div>
                <div className="hidden md:block flex-1">
                  <div className="font-medium text-gray-800 text-sm">
                    {user.username}
                    {user.username === username && (
                      <span className="text-xs text-purple-500 ml-1">(вы)</span>
                    )}
                  </div>
                  {typingUsers.includes(user.username) && (
                    <div className="text-xs text-gray-500 italic">печатает...</div>
                  )}
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
