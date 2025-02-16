const { ConversationChain } = require("langchain/chains");
const { ChatOpenAI } = require("@langchain/openai");
const { MongoDBChatMessageHistory } = require("@langchain/mongodb");
const { PromptTemplate } = require("@langchain/core/prompts");
const { MongoClient } = require("mongodb");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const axios = require('axios');

// Initialize MongoDB connection for chat history
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("galerie");
const chatHistoryCollection = db.collection("chatHistory");

// Create base prompt template
const basePrompt = PromptTemplate.fromTemplate(`
Vous êtes un assistant spécialisé dans l'art, expert de la galerie.

Contexte de la base de données :
{dbContext}

Question de l'utilisateur : {userInput}

Instructions :
1. Répondez uniquement en utilisant les informations de la base de données
2. Utilisez un français professionnel et le vouvoiement
3. Utilisez la terminologie précise du monde de l'art
4. Respectez la typographie française (espace avant : ! ? ;)

Réponse :`);

async function getChatHistory(sessionId) {
  try {
    const history = new MongoDBChatMessageHistory({
      collection: chatHistoryCollection,
      sessionId: sessionId,
      config: {
        ignoreConsistencyErrors: true
      }
    });
    
    await history.init();
    return history;
  } catch (error) {
    console.error('Error initializing chat history:', error);
    throw new Error('Failed to initialize chat history');
  }
}

async function queryDatabase(collections, query) {
  try {
    const results = [];
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      
      // Create text search query with multiple terms
      const searchTerms = query.split(' ').filter(term => term.length > 2);
      
      const docs = await collection.find({
        $or: [
          { $text: { $search: query } },
          ...searchTerms.map(term => ({
            $or: [
              { nom: { $regex: term, $options: 'i' } },
              { titre: { $regex: term, $options: 'i' } },
              { description: { $regex: term, $options: 'i' } },
              { commentaires: { $regex: term, $options: 'i' } }
            ]
          }))
        ]
      }).limit(5).toArray();
      
      if (docs.length > 0) {
        results.push({
          collection: collectionName,
          documents: docs
        });
      }
    }
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function chatWithBot(sessionId, userInput, collections) {
  try {
    const history = await getChatHistory(sessionId);
    await history.addMessage(new HumanMessage(userInput));
    
    const dbResults = await queryDatabase(collections, userInput);
    
    if (dbResults.length === 0) {
      return {
        response: "Je suis désolé, je n'ai trouvé aucune information correspondant à votre recherche dans la base de données. Pouvez-vous reformuler votre question ?",
        dbResults: [],
        collections
      };
    }

    // Direct call to Mistral through Ollama
    try {
      const response = await axios.post('http://localhost:11434/api/chat', {
        model: 'mistral-nemo:latest',
        messages: [
          {
            role: 'system',
            content: await basePrompt.format({
              dbContext: JSON.stringify(dbResults, null, 2),
              userInput
            })
          },
          {
            role: 'user',
            content: userInput
          }
        ],
        stream: false
      });

      const assistantResponse = response.data.message.content;
      await history.addMessage(new SystemMessage(assistantResponse));

      return {
        response: assistantResponse,
        dbResults,
        collections
      };
    } catch (error) {
      console.error("Ollama API error:", error);
      throw new Error("Erreur de communication avec le modèle Mistral");
    }
  } catch (error) {
    console.error("Chat error:", error);
    throw new Error("Une erreur est survenue lors du traitement de votre demande.");
  }
}

module.exports = {
  chatWithBot,
  getChatHistory,
  queryDatabase
}; 