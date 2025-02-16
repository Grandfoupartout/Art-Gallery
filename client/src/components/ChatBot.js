import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Chatbot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  const chatBodyRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, typingMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const simulateTyping = (text) => {
    return new Promise((resolve) => {
      let index = 0;
      setTypingMessage('');
      const interval = setInterval(() => {
        setTypingMessage((prev) => prev + text.charAt(index));
        index++;
        if (index >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  };

  const sendMessage = async () => {
    if (!userInput.trim() || loading) return;

    const newMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, newMessage]);
    setUserInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:11434/v1/chat/completions',
        {
          model: 'mistral-nemo:latest',
          messages: [
            {
              role: 'system',
              content: 'Vous êtes un assistant spécialisé dans l\'art, expert de la galerie. Répondez en français professionnel.'
            },
            ...messages,
            newMessage
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const assistantResponse = response.data?.choices?.[0]?.message?.content || 
        'Je suis désolé, je ne peux pas répondre pour le moment.';

      await simulateTyping(assistantResponse);
      setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);
      setTypingMessage('');
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h2>Assistant Galerie d'Art</h2>
      </div>

      <div className="chatbot-body" ref={chatBodyRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
            <div className="message-bubble">
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {typingMessage && (
          <div className="message assistant-message">
            <div className="message-bubble">
              <p>{typingMessage}</p>
            </div>
          </div>
        )}
      </div>

      <div className="chatbot-footer">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Posez votre question..."
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button 
          onClick={sendMessage} 
          disabled={loading || !userInput.trim()}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
