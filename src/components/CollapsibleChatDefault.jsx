import React, { useState } from 'react';
import { MessageCircle, ChevronRight, ChevronLeft, Minimize2, Maximize2 } from 'lucide-react';
import ChatInterface from './ChatInterface';

const CollapsibleChatDefault = ({ messages, isTyping, isConnected, onSendMessage }) => {
  // Inicia DESPLEGADO por defecto
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Botón flotante cuando está colapsado */}
      {isCollapsed && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={toggleCollapse}
            className="h-16 w-16 rounded-full shadow-2xl bg-[#1a1a1a] hover:bg-[#EE0027] text-white transition-all duration-300 hover:scale-110 flex items-center justify-center border-4 border-white"
            aria-label="Abrir chat"
          >
            <MessageCircle className="h-8 w-8" />
          </button>
        </div>
      )}

      {/* Panel del chat expandido */}
      {!isCollapsed && (
        <div
          className={`fixed right-0 top-0 h-screen z-40 transition-all duration-300 ease-in-out shadow-2xl ${
            isMinimized ? 'w-80' : 'w-96 lg:w-[450px]'
          }`}
        >
          {/* Barra de control superior */}
          <div className="bg-[#EE0027] text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCollapse}
                className="h-9 w-9 rounded hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Cerrar chat"
                aria-label="Cerrar chat"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={toggleMinimize}
                className="h-9 w-9 rounded hover:bg-white/20 flex items-center justify-center transition-colors"
                title={isMinimized ? "Expandir" : "Minimizar"}
                aria-label={isMinimized ? "Expandir" : "Minimizar"}
              >
                {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>

          {/* Contenido del chat con el componente original */}
          <div className="h-[calc(100vh-48px)] bg-white">
            <ChatInterface
              messages={messages}
              isTyping={isTyping}
              isConnected={isConnected}
              onSendMessage={onSendMessage}
            />
          </div>
        </div>
      )}

      {/* Overlay oscuro cuando el chat está abierto - funciona en todas las pantallas */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-transparent z-30 transition-opacity duration-300"
          onClick={toggleCollapse}
        />
      )}
    </>
  );
};

export default CollapsibleChatDefault;