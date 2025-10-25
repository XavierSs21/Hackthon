"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User } from "lucide-react"

const ChatInterface = ({ messages, isTyping, isConnected, onSendMessage }) => {
  const [inputText, setInputText] = useState("")
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Auto-resize del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [inputText])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputText.trim() && !isTyping) {
      onSendMessage(inputText.trim())
      setInputText("")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    // Light gray background for the whole chat module
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md flex flex-col h-[600px] lg:h-[calc(100vh-180px)] bg-gray-50">
      {/* Header del chat (Banorte red) */}
      <div className="px-4 py-3 border-b border-gray-200 bg-[#EE0027] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Asistente Financiero</h3>
              <p className="text-xs text-white/80">{isConnected ? "En línea" : "Desconectado"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
        {messages.map((message) => {
          const isUser = message.sender === "user"
          return (
            <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-2 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUser
                      ? "bg-[#EE0027] text-white"
                      : "bg-white border border-gray-200 text-gray-700"
                  }`}
                >
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Burbuja */}
                <div>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isUser
                        ? "bg-[#EE0027] text-white rounded-tr-sm"
                        : "bg-white text-gray-900 border border-gray-200 rounded-tl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      isUser ? "text-gray-500 text-right" : "text-gray-500 text-left"
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Indicador de escritura (usar tonos de la interfaz) */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-gray-700" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#EE0027] rounded-full animate-pulse-dot"></div>
                  <div className="w-2 h-2 bg-[#EE0027] rounded-full animate-pulse-dot"></div>
                  <div className="w-2 h-2 bg-[#EE0027] rounded-full animate-pulse-dot"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de texto */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: ¿Cuál fue el flujo de caja del Q3? o Simula aumento del 10% en ventas"
            disabled={isTyping}
            className="flex-1 chat-textarea px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE0027] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            rows="1"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="px-4 py-2 bg-[#EE0027] text-white rounded-lg hover:bg-[#C70021] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            aria-label="Enviar mensaje"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatInterface
