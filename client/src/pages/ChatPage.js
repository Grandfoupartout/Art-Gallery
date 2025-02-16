import React from 'react';
import ChatBot from '../components/ChatBot';
import './ChatPage.css';

const ChatPage = () => {
  return (
    <div className="chat-page">
      <h2>AI Assistant</h2>
      <ChatBot />
    </div>
  );
};

export default ChatPage; 