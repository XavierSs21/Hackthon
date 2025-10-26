import React, { useState } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import ChatInterface from './ChatInterface';

const CollapsibleChatDefault = ({ messages, isTyping, isConnected, onSendMessage }) => {
  // Inicia COLAPSADO por defecto (como Messenger)
  const [isCollapsed, setIsCollapsed] = useState(true);
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
      {/* Barra clickeable estilo Messenger - cuando está colapsado */}
      {isCollapsed && (
        <div className="fixed bottom-0 right-6 z-50">
          <button
            onClick={toggleCollapse}
            className="bg-gradient-to-r from-[#EE0027] to-[#C70021] text-white px-6 py-4 rounded-t-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex items-center gap-3 min-w-[280px] group"
            aria-label="Abrir chat"
          >
            <div className="relative">
              <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
              {isConnected && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">¿Necesitas ayuda?</p>
              <p className="text-xs opacity-90">Chatea con tu Copiloto Financiero</p>
            </div>
            <div className="text-white/80 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Panel del chat compacto estilo Messenger */}
      {!isCollapsed && (
        <div
          className={`fixed bottom-0 right-6 z-50 transition-all duration-300 ease-in-out ${
            isMinimized ? 'w-80' : 'w-96'
          }`}
          style={{ height: isMinimized ? '60px' : '600px' }}
        >
          <div className="bg-white rounded-t-2xl shadow-2xl h-full flex flex-col overflow-hidden border border-gray-200">
            {/* Header compacto */}
            <div className="bg-gradient-to-r from-[#EE0027] to-[#C70021] text-white px-4 py-3 flex items-center justify-between cursor-pointer"
                 onClick={toggleMinimize}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  {isConnected && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">Copiloto Financiero</p>
                  <p className="text-xs opacity-90">
                    {isConnected ? 'En línea' : 'Desconectado'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMinimize();
                  }}
                  className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                  title={isMinimized ? "Expandir" : "Minimizar"}
                  aria-label={isMinimized ? "Expandir" : "Minimizar"}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse();
                  }}
                  className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                  title="Cerrar chat"
                  aria-label="Cerrar chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Contenido del chat */}
            {!isMinimized && (
              <div className="flex-1 overflow-hidden" style={{ height: 'calc(600px - 60px)' }}>
                <div className="h-full">
                  <ChatInterface
                    messages={messages}
                    isTyping={isTyping}
                    isConnected={isConnected}
                    onSendMessage={onSendMessage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CollapsibleChatDefault;