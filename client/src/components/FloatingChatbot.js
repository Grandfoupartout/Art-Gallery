import React, { useState } from 'react';
import ChatBot from './ChatBot';
import './FloatingChatbot.css';

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`floating-chatbot ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button 
          className="chatbot-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat assistant"
        >
          <i className="fas fa-comments"></i>
        </button>
      )}

      {isOpen && (
        <ChatBot 
          floating={true} 
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FloatingChatbot; 