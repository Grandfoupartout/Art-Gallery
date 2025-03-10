const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socket = require('socket.io');
const { spawn } = require('child_process');
const axios = require('axios');
require('dotenv').config();
const { chatWithBot, getChatHistory } = require('./services/chatService.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/galerie', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// First, define the Counter schema and model
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Helper function for getting next sequence
const getNextSequence = async (name) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

// Then define schemas with their pre-save hooks BEFORE creating models
const partenaireSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  nom: String,
  type: String,
  coordonnees: String,
  datePartenariat: Date,
  conditions: String,
  commentaires: String,
});

partenaireSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `P${await getNextSequence('partenaire_id')}`;
  }
  next();
});

const clientSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  nom: { type: String, required: true },
  email: String,
  telephone: String,
  adresse: String,
  preferences: String,
  categorie: {
    type: String,
    enum: ['vip', 'regular', 'prospect', 'inactive', '']
  },
  idPartenaire: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Partenaire',
    required: false
  },
  historiqueAchats: String,
  derniereRelance: {
    type: Date,
    required: false
  },
  dateDernierContact: {
    type: Date,
    required: false
  },
  commentaires: String
});

clientSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `C${await getNextSequence('client_id')}`;
  }
  
  // Convert date strings to Date objects
  if (this.derniereRelance && typeof this.derniereRelance === 'string') {
    this.derniereRelance = new Date(this.derniereRelance);
  }
  if (this.dateDernierContact && typeof this.dateDernierContact === 'string') {
    this.dateDernierContact = new Date(this.dateDernierContact);
  }

  next();
});

const artisteSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  nom: String,
  prenom: String,
  statut: String,
  telephone: String,
  email: String,
  adresse: String,
  ville: String,
  codePostal: String,
  dateIntegration: Date,
  commentaires: String
});

artisteSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `A${await getNextSequence('artiste_id')}`;
  }
  next();
});

const budgetSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  date: { 
    type: Date,
    required: true,
    set: function(val) {
      if (!val) return val;
      const date = new Date(val);
      if (isNaN(date.getTime())) return val;
      date.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
      return date;
    }
  },
  categorie: { 
    type: String, 
    required: true
  },
  description: String,
  montant: { 
    type: Number, 
    required: true 
  },
  type: {
    type: String,
    enum: ['revenu', 'depense'],
    required: true
  }
});

// Add pre-save middleware for budget ID generation
budgetSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `B${await getNextSequence('budget_id')}`;
  }
  next();
});

// Add pre-save middleware for montant handling
budgetSchema.pre('save', function(next) {
  // Ensure montant is a number
  this.montant = Number(this.montant);
  
  // Handle sign based on type
  if (this.type === 'depense' && this.montant > 0) {
    this.montant = -this.montant;
  } else if (this.type === 'revenu' && this.montant < 0) {
    this.montant = Math.abs(this.montant);
  }
  next();
});

const oeuvreSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  titre: String,
  idArtiste: { type: mongoose.Schema.Types.ObjectId, ref: 'Artiste' },
  anneeCreation: Number,
  technique: String,
  dimensions: String,
  prixVente: Number,
  reduction: Number,
  statut: String,
  dateVente: Date,
  commentaires: String,
  propertyStatus: {
    type: String,
    enum: ['gallery', 'consignment', 'other']
  },
  consignmentDuration: {
    type: String,
    enum: ['less3', '3to6', 'more6']
  },
  availability: {
    type: String,
    enum: ['available', 'reserved', 'sold']
  }
});

oeuvreSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `O${await getNextSequence('oeuvre_id')}`;
  }
  next();
});

const venteSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  dateVente: { 
    type: Date,
    required: true,
    set: function(val) {
      // Ensure date is stored in UTC
      if (val) {
        const date = new Date(val);
        return date.toISOString();
      }
      return val;
    }
  },
  idClient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client',
    required: true
  },
  idOeuvre: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Oeuvre',
    required: true
  },
  prixVente: { type: Number, required: true },
  commission: { type: Number },
  modePaiement: { type: String },
  commentaires: { type: String }
});

// Add a pre-save middleware to validate dates
venteSchema.pre('save', function(next) {
  if (this.dateVente) {
    const date = new Date(this.dateVente);
    if (isNaN(date.getTime())) {
      next(new Error('Date de vente invalide'));
      return;
    }
  }
  next();
});

venteSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `V${await getNextSequence('vente_id')}`;
  }
  next();
});

// AFTER defining all schemas and their pre-save hooks, create the models
const Partenaire = mongoose.model('Partenaire', partenaireSchema);
const Client = mongoose.model('Client', clientSchema);
const Artiste = mongoose.model('Artiste', artisteSchema);
const Budget = mongoose.model('Budget', budgetSchema);
const Oeuvre = mongoose.model('Oeuvre', oeuvreSchema);
const Vente = mongoose.model('Vente', venteSchema);

// Define schema and model for Suivi (Action)
const suiviSchema = new mongoose.Schema({
  id: String,
  idClient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  dateContact: {
    type: Date,
    required: true
  },
  typeContact: {
    type: String,
    required: true,
    enum: ['Email', 'Téléphone', 'Rendez-vous', 'Autre']
  },
  contenu: String,
  suite: String,
  rappel: Date,
  statut: {
    type: String,
    enum: ['En cours', 'Terminé', 'En attente', ''],
    default: 'En cours'
  },
  priorite: {
    type: String,
    enum: ['Haute', 'Moyenne', 'Basse', ''],
    default: 'Moyenne'
  }
});

const Suivi = mongoose.model('Suivi', suiviSchema);

// Add this with your other schemas
const chatSettingsSchema = new mongoose.Schema({
  forceDbMode: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
});

const ChatSettings = mongoose.model('ChatSettings', chatSettingsSchema);

// API Endpoints for Partenaires (Partners)
app.get('/api/partenaires', async (req, res) => {
  try {
    const partenaires = await Partenaire.find();
    res.json(partenaires);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching partenaires' });
  }
});

app.post('/api/partenaires', async (req, res) => {
  try {
    const { id, ...partenaireData } = req.body; // Remove id from request body
    const newPartenaire = new Partenaire(partenaireData);
    await newPartenaire.save();
    res.json(newPartenaire);
  } catch (error) {
    res.status(400).json({ message: 'Error adding partenaire', error: error.message });
  }
});

app.put('/api/partenaires/:id', async (req, res) => {
  try {
    const updatedPartenaire = await Partenaire.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedPartenaire) {
      return res.status(404).json({ message: 'Partenaire non trouvé' });
    }

    res.json(updatedPartenaire);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification du partenaire', error: error.message });
  }
});


app.delete('/api/partenaires/:id', async (req, res) => {
  try {
    const deletedPartenaire = await Partenaire.findByIdAndDelete(req.params.id);
    if (!deletedPartenaire) {
      return res.status(404).json({ message: 'Partenaire not found' });
    }
    res.json({ message: 'Partenaire deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting partenaire', error: error.message });
  }
});

// API Endpoints for Clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.find()
      .populate('idPartenaire')
      .lean()
      .exec();

    // Format dates for client-side display
    const formattedClients = clients.map(client => ({
      ...client,
      derniereRelance: client.derniereRelance ? 
        client.derniereRelance.toISOString().split('T')[0] : null,
      dateDernierContact: client.dateDernierContact ? 
        client.dateDernierContact.toISOString().split('T')[0] : null
    }));

    res.json(formattedClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des clients',
      error: error.message 
    });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const clientData = { ...req.body };

    // Validate required fields
    if (!clientData.nom) {
      return res.status(400).json({ 
        message: 'Le nom du client est requis' 
      });
    }

    // Handle empty strings for optional fields
    if (clientData.idPartenaire === '') {
      clientData.idPartenaire = null;
    }
    if (clientData.categorie === '') {
      clientData.categorie = null;
    }

    // Handle date fields
    if (clientData.derniereRelance) {
      clientData.derniereRelance = new Date(clientData.derniereRelance);
    }
    if (clientData.dateDernierContact) {
      clientData.dateDernierContact = new Date(clientData.dateDernierContact);
    }

    // Create new client
    const newClient = new Client(clientData);
    await newClient.save();

    // Populate partenaire data before sending response
    const populatedClient = await Client.findById(newClient._id)
      .populate('idPartenaire')
      .lean();

    // Format dates for response
    const formattedClient = {
      ...populatedClient,
      derniereRelance: populatedClient.derniereRelance ? 
        populatedClient.derniereRelance.toISOString().split('T')[0] : null,
      dateDernierContact: populatedClient.dateDernierContact ? 
        populatedClient.dateDernierContact.toISOString().split('T')[0] : null
    };

    res.status(201).json(formattedClient);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la création du client',
      error: error.message 
    });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Handle empty strings for optional fields
    if (updateData.idPartenaire === '') {
      updateData.idPartenaire = null;
    }
    if (updateData.categorie === '') {
      updateData.categorie = null;
    }

    // Handle date conversions
    if (updateData.derniereRelance) {
      updateData.derniereRelance = new Date(updateData.derniereRelance);
    }
    if (updateData.dateDernierContact) {
      updateData.dateDernierContact = new Date(updateData.dateDernierContact);
    }

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('idPartenaire')
    .lean();

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    // Format dates for response
    const formattedClient = {
      ...updatedClient,
      derniereRelance: updatedClient.derniereRelance ? 
        updatedClient.derniereRelance.toISOString().split('T')[0] : null,
      dateDernierContact: updatedClient.dateDernierContact ? 
        updatedClient.dateDernierContact.toISOString().split('T')[0] : null
    };

    res.json(formattedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la mise à jour du client',
      error: error.message 
    });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    // Check if client has related ventes
    const relatedVentes = await Vente.find({ idClient: req.params.id });
    if (relatedVentes.length > 0) {
      return res.status(400).json({ 
        message: 'Impossible de supprimer le client car il a des ventes associées' 
      });
    }

    const deletedClient = await Client.findByIdAndDelete(req.params.id);
    if (!deletedClient) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    // Delete related suivis
    await Suivi.deleteMany({ idClient: req.params.id });

    res.json({ message: 'Client et suivis associés supprimés avec succès' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du client', 
      error: error.message 
    });
  }
});

// API Endpoints for Artistes
app.get('/api/artistes', async (req, res) => {
  try {
    const artistes = await Artiste.find();
    res.json(artistes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching artistes' });
  }
});

app.post('/api/artistes', async (req, res) => {
  try {
    const { id, ...artisteData } = req.body;
    const newArtiste = new Artiste(artisteData);
    await newArtiste.save();
    res.json(newArtiste);
  } catch (error) {
    res.status(400).json({ message: 'Error adding artiste', error: error.message });
  }
});

app.delete('/api/artistes/:id', async (req, res) => {
  try {
    const artisteId = req.params.id;
    // Check if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(artisteId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const deletedArtiste = await Artiste.findByIdAndDelete(artisteId);

    if (!deletedArtiste) {
      return res.status(404).json({ message: 'Artiste non trouvé' });
    }

    res.json({ message: 'Artiste supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
});

app.put('/api/artistes/:id', async (req, res) => {
  try {
    const updatedArtiste = await Artiste.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedArtiste) {
      return res.status(404).json({ message: 'Artiste non trouvé' });
    }
    res.json(updatedArtiste);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification', error: error.message });
  }
});

// API Endpoints for Budget
app.get('/api/budget', async (req, res) => {
  try {
    const budgets = await Budget.find().lean();
    
    // Format dates for client-side display
    const formattedBudgets = budgets.map(budget => ({
      ...budget,
      date: budget.date ? budget.date.toISOString().split('T')[0] : null
    }));
    
    res.json(formattedBudgets);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du budget',
      error: error.message 
    });
  }
});

app.post('/api/budget', async (req, res) => {
  try {
    const budgetData = { ...req.body };

    // Handle empty or missing fields
    if (!budgetData.date || !budgetData.type || !budgetData.montant) {
      return res.status(400).json({ 
        message: 'La date, le type et le montant sont requis' 
      });
    }

    // Convert and validate date
    try {
      budgetData.date = new Date(budgetData.date);
      if (isNaN(budgetData.date.getTime())) {
        return res.status(400).json({ message: 'Format de date invalide' });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Format de date invalide' });
    }

    // Convert and validate montant
    budgetData.montant = Number(budgetData.montant);
    if (isNaN(budgetData.montant)) {
      return res.status(400).json({ message: 'Le montant doit être un nombre' });
    }

    // Create and save new budget entry
    const newBudget = new Budget(budgetData);
    await newBudget.save();

    // Format date for response
    const formattedBudget = {
      ...newBudget.toObject(),
      date: newBudget.date.toISOString().split('T')[0]
    };

    res.status(201).json(formattedBudget);
  } catch (error) {
    console.error('Error creating budget entry:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la création de l\'entrée budgétaire',
      error: error.message 
    });
  }
});

app.put('/api/budget/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Convert and validate date if present
    if (updateData.date) {
      try {
        updateData.date = new Date(updateData.date);
        if (isNaN(updateData.date.getTime())) {
          return res.status(400).json({ message: 'Format de date invalide' });
        }
      } catch (error) {
        return res.status(400).json({ message: 'Format de date invalide' });
      }
    }

    // Convert and validate montant if present
    if (updateData.montant !== undefined) {
      updateData.montant = Number(updateData.montant);
      if (isNaN(updateData.montant)) {
        return res.status(400).json({ message: 'Le montant doit être un nombre' });
      }

      // Handle sign based on type
      if (updateData.type === 'depense' && updateData.montant > 0) {
        updateData.montant = -updateData.montant;
      } else if (updateData.type === 'revenu' && updateData.montant < 0) {
        updateData.montant = Math.abs(updateData.montant);
      }
    }

    const updatedBudget = await Budget.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBudget) {
      return res.status(404).json({ message: 'Entrée budgétaire non trouvée' });
    }

    // Format date for response
    const formattedBudget = {
      ...updatedBudget,
      date: updatedBudget.date.toISOString().split('T')[0]
    };

    res.json(formattedBudget);
  } catch (error) {
    console.error('Error updating budget entry:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la mise à jour de l\'entrée budgétaire',
      error: error.message 
    });
  }
});

app.delete('/api/budget/:id', async (req, res) => {
  try {
    const deletedBudget = await Budget.findByIdAndDelete(req.params.id);
    
    if (!deletedBudget) {
      return res.status(404).json({ 
        message: 'Entrée budgétaire non trouvée' 
      });
    }

    res.json({ message: 'Entrée budgétaire supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting budget entry:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la suppression de l\'entrée budgétaire',
      error: error.message 
    });
  }
});

// API Endpoints for Œuvres
app.get('/api/oeuvres', async (req, res) => {
  try {
    const oeuvres = await Oeuvre.find().populate('idArtiste');
    res.json(oeuvres);
  } catch (error) {
    console.error('Error fetching oeuvres:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des oeuvres' 
    });
  }
});

app.post('/api/oeuvres', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.titre || !req.body.idArtiste) {
      return res.status(400).json({ 
        message: 'Le titre et l\'artiste sont requis' 
      });
    }

    // Verify artiste exists
    const artiste = await Artiste.findById(req.body.idArtiste);
    if (!artiste) {
      return res.status(400).json({ 
        message: 'Artiste non trouvé' 
      });
    }

    const newOeuvre = new Oeuvre(req.body);
    await newOeuvre.save();

    // Populate artiste data before sending response
    const populatedOeuvre = await Oeuvre.findById(newOeuvre._id).populate('idArtiste');
    res.status(201).json(populatedOeuvre);
  } catch (error) {
    console.error('Error creating oeuvre:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la création de l\'oeuvre',
      error: error.message 
    });
  }
});

app.put('/api/oeuvres/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    // Ensure dateVente is properly formatted when saving
    if (updateData.dateVente) {
      updateData.dateVente = new Date(updateData.dateVente).toISOString();
    }

    const updatedOeuvre = await Oeuvre.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('idArtiste');

    if (!updatedOeuvre) {
      return res.status(404).json({ message: 'Oeuvre non trouvée' });
    }

    res.json(updatedOeuvre);
  } catch (error) {
    console.error('Error updating oeuvre:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la mise à jour de l\'oeuvre', 
      error: error.message 
    });
  }
});

// API Endpoints for Suivi (Action)
app.get('/api/suivis', async (req, res) => {
  try {
    const suivis = await Suivi.find().populate('idClient');
    res.json(suivis);
  } catch (error) {
    console.error('Error fetching suivis:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des suivis' });
  }
});

app.post('/api/suivis', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.idClient) {
      return res.status(400).json({
        message: 'Erreur: Client requis',
        error: 'Missing required field: idClient'
      });
    }

    if (!req.body.dateContact) {
      return res.status(400).json({
        message: 'Erreur: Date de contact requise',
        error: 'Missing required field: dateContact'
      });
    }

    if (!req.body.typeContact) {
      return res.status(400).json({
        message: 'Erreur: Type de contact requis',
        error: 'Missing required field: typeContact'
      });
    }

    // Check if client exists
    const clientExists = await Client.findById(req.body.idClient);
    if (!clientExists) {
      return res.status(400).json({
        message: 'Erreur: Client non trouvé',
        error: 'Invalid client ID'
      });
    }

    const newSuivi = new Suivi({
      ...req.body,
      dateContact: new Date(req.body.dateContact),
      rappel: req.body.rappel ? new Date(req.body.rappel) : undefined
    });

    const savedSuivi = await newSuivi.save();
    const populatedSuivi = await Suivi.findById(savedSuivi._id).populate('idClient');

    res.status(201).json(populatedSuivi);
  } catch (error) {
    console.error('Error creating suivi:', error);
    res.status(400).json({
      message: 'Erreur lors de la création du suivi',
      error: error.message
    });
  }
});

app.put('/api/suivis/:id', async (req, res) => {
  try {
    const updatedSuivi = await Suivi.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    ).populate('idClient');

    if (!updatedSuivi) {
      return res.status(404).json({ message: 'Suivi non trouvé' });
    }
    res.json(updatedSuivi);
  } catch (error) {
    console.error('Error updating suivi:', error);
    res.status(400).json({
      message: 'Erreur lors de la mise à jour du suivi',
      error: error.message
    });
  }
});

app.delete('/api/suivis/:id', async (req, res) => {
  try {
    const deletedSuivi = await Suivi.findOneAndDelete({ id: req.params.id });
    if (!deletedSuivi) {
      return res.status(404).json({ message: 'Suivi non trouvé' });
    }
    res.json({ message: 'Suivi supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting suivi:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression du suivi',
      error: error.message
    });
  }
});

// API Endpoints for Ventes
app.get('/api/ventes', async (req, res) => {
  try {
    const ventes = await Vente.find()
      .populate('idClient')
      .populate('idOeuvre')
      .lean();

    // Format dates for client-side display
    const formattedVentes = ventes.map(vente => ({
      ...vente,
      dateVente: vente.dateVente ? 
        vente.dateVente.toISOString().split('T')[0] : null
    }));

    res.json(formattedVentes);
  } catch (error) {
    console.error('Error fetching ventes:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des ventes',
      error: error.message 
    });
  }
});

app.post('/api/ventes', async (req, res) => {
  try {
    const venteData = { ...req.body };

    // Validate required fields
    if (!venteData.idClient || !venteData.idOeuvre || !venteData.dateVente) {
      return res.status(400).json({ 
        message: 'Le client, l\'oeuvre et la date sont requis' 
      });
    }

    // Convert and validate date
    try {
      venteData.dateVente = new Date(venteData.dateVente);
      if (isNaN(venteData.dateVente.getTime())) {
        return res.status(400).json({ message: 'Format de date invalide' });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Format de date invalide' });
    }

    // Create new vente
    const newVente = new Vente(venteData);
    await newVente.save();

    // Create corresponding budget entry
    const budgetEntry = new Budget({
      date: venteData.dateVente,
      categorie: 'Ventes',
      description: `Vente: ${venteData.idOeuvre}`,
      montant: venteData.prixVente,
      type: 'revenu'
    });
    await budgetEntry.save();

    // If commission exists, create a commission budget entry
    if (venteData.commission) {
      const commissionEntry = new Budget({
        date: venteData.dateVente,
        categorie: 'Commissions',
        description: `Commission sur vente: ${venteData.idOeuvre}`,
        montant: venteData.commission,
        type: 'revenu'
      });
      await commissionEntry.save();
    }

    // Populate the response
    const populatedVente = await Vente.findById(newVente._id)
      .populate('idClient')
      .populate('idOeuvre')
      .lean();

    // Format date for response
    const formattedVente = {
      ...populatedVente,
      dateVente: populatedVente.dateVente.toISOString().split('T')[0]
    };

    res.status(201).json(formattedVente);
  } catch (error) {
    console.error('Error creating vente:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la création de la vente',
      error: error.message 
    });
  }
});

app.put('/api/ventes/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    const originalVente = await Vente.findById(req.params.id);

    if (!originalVente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }

    // Convert and validate date if present
    if (updateData.dateVente) {
      try {
        updateData.dateVente = new Date(updateData.dateVente);
        if (isNaN(updateData.dateVente.getTime())) {
          return res.status(400).json({ message: 'Format de date invalide' });
        }
      } catch (error) {
        return res.status(400).json({ message: 'Format de date invalide' });
      }
    }

    // Update vente
    const updatedVente = await Vente.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('idClient')
    .populate('idOeuvre')
    .lean();

    // Update or create budget entries
    if (updateData.prixVente !== undefined || updateData.dateVente) {
      await Budget.findOneAndUpdate(
        { 
          description: `Vente: ${originalVente.idOeuvre}`,
          type: 'revenu',
          categorie: 'Ventes'
        },
        {
          date: updateData.dateVente || originalVente.dateVente,
          montant: updateData.prixVente || originalVente.prixVente
        },
        { upsert: true }
      );
    }

    // Handle commission updates
    if (updateData.commission !== undefined || updateData.dateVente) {
      if (updateData.commission) {
        await Budget.findOneAndUpdate(
          {
            description: `Commission sur vente: ${originalVente.idOeuvre}`,
            type: 'revenu',
            categorie: 'Commissions'
          },
          {
            date: updateData.dateVente || originalVente.dateVente,
            montant: updateData.commission
          },
          { upsert: true }
        );
      }
    }

    // Format date for response
    const formattedVente = {
      ...updatedVente,
      dateVente: updatedVente.dateVente.toISOString().split('T')[0]
    };

    res.json(formattedVente);
  } catch (error) {
    console.error('Error updating vente:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la mise à jour de la vente',
      error: error.message 
    });
  }
});

// Update the DELETE endpoint for ventes
app.delete('/api/ventes/:id', async (req, res) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }

    // Delete the vente
    await Vente.findByIdAndDelete(req.params.id);

    // Delete related budget entries
    await Budget.deleteMany({
      $or: [
        { description: `Vente: ${vente.idOeuvre}` },
        { description: `Commission sur vente: ${vente.idOeuvre}` }
      ]
    });

    res.json({ message: 'Vente et entrées budgétaires associées supprimées avec succès' });
  } catch (error) {
    console.error('Error deleting vente:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la suppression de la vente',
      error: error.message 
    });
  }
});

// Update the delete endpoint for oeuvres
app.delete('/api/oeuvres/:id', async (req, res) => {
  try {
    const deletedOeuvre = await Oeuvre.findByIdAndDelete(req.params.id);
    
    if (!deletedOeuvre) {
      return res.status(404).json({ 
        message: 'Oeuvre non trouvée' 
      });
    }

    res.json({ message: 'Oeuvre supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting oeuvre:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la suppression de l\'oeuvre',
      error: error.message 
    });
  }
});

// Add this with your other endpoints
app.get('/api/status', (req, res) => {
  res.json({
    mongoConnected: mongoose.connection.readyState === 1,
    collections: {
      artistes: mongoose.connection.collections.artistes ? true : false,
      oeuvres: mongoose.connection.collections.oeuvres ? true : false,
      ventes: mongoose.connection.collections.ventes ? true : false,
      clients: mongoose.connection.collections.clients ? true : false
    }
  });
});

// Add these routes
app.get('/api/collections', (req, res) => {
  try {
    const collections = Object.keys(mongoose.connection.collections);
    res.json(collections);
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: 'Error getting collections' });
  }
});

app.get('/api/chat/settings', async (req, res) => {
  try {
    const settings = await ChatSettings.findOne() || await new ChatSettings().save();
    res.json({
      forceDbMode: settings.forceDbMode,
      mongoConnected: mongoose.connection.readyState === 1
    });
  } catch (error) {
    console.error('Error getting chat settings:', error);
    res.status(500).json({ error: 'Error getting chat settings' });
  }
});

app.post('/api/chat/toggleForceMode', async (req, res) => {
  try {
    let settings = await ChatSettings.findOne() || new ChatSettings();
    settings.forceDbMode = !settings.forceDbMode;
    settings.lastUpdated = new Date();
    await settings.save();
    
    io.emit('force mode changed', settings.forceDbMode);
    
    res.json({ 
      forceDbMode: settings.forceDbMode,
      message: settings.forceDbMode ? 
        'Mode base de données activé' : 
        'Mode IA + base de données activé'
    });
  } catch (error) {
    console.error('Erreur lors du changement de mode:', error);
    res.status(500).json({ 
      error: 'Erreur lors du changement de mode',
      message: 'Une erreur est survenue lors du changement de mode'
    });
  }
});

// Chat history endpoints
app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await getChatHistory(sessionId);
    const messages = await history.getMessages();
    res.json({ messages });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Error retrieving chat history' });
  }
});

app.post('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const history = await getChatHistory(sessionId);
    await history.addMessage(message);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Error saving chat message' });
  }
});

// After creating the Express app, create HTTP and Socket.IO servers
const server = http.createServer(app);
const io = socket(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Add these helper functions for database queries
const queryCollections = async (collections, query) => {
  const results = [];
  
  for (const collection of collections) {
    const model = mongoose.model(collection.charAt(0).toUpperCase() + collection.slice(1));
    
    // Build query based on collection fields
    const queryFields = getCollectionFields(collection);
    const searchQuery = buildSearchQuery(queryFields, query);
    
    const data = await model.find(searchQuery)
      .limit(20)
      .sort({ dateCreation: -1, date: -1, _id: -1 });
      
    results.push(...data.map(doc => ({
      ...doc.toObject(),
      _collection: collection // Add collection name for reference
    })));
  }
  return results;
};

const getCollectionFields = (collection) => {
  const fieldMappings = {
    artistes: ['nom', 'prenom', 'statut', 'commentaires'],
    oeuvres: ['titre', 'technique', 'dimensions', 'statut', 'commentaires'],
    ventes: ['date', 'prixVente', 'modePaiement', 'commentaires'],
    clients: ['nom', 'categorie', 'commentaires']
  };
  return fieldMappings[collection] || [];
};

const buildSearchQuery = (fields, searchText) => {
  const searchRegex = { $regex: searchText, $options: 'i' };
  return {
    $or: [
      ...fields.map(field => ({ [field]: searchRegex })),
      // Add numeric search for relevant fields
      ...(isNumeric(searchText) ? [
        { prixVente: Number(searchText) },
        { commission: Number(searchText) }
      ] : []),
      // Add date search if text is a date
      ...(isDate(searchText) ? [
        { date: parseDate(searchText) },
        { dateCreation: parseDate(searchText) },
        { dateVente: parseDate(searchText) }
      ] : [])
    ]
  };
};

// Add these helper functions for French natural language processing
const processNaturalLanguageQuery = (query) => {
  // French keywords and patterns for art gallery queries
  const queryPatterns = {
    artistes: {
      keywords: [
        'artiste', 'peintre', 'sculpteur', 'créateur', 'auteur',
        'qui a créé', 'qui a fait', 'réalisé par'
      ],
      attributes: {
        'nom': ['nom', 'appelle', 'nommé', 'qui est'],
        'statut': ['statut', 'situation', 'état', 'activité'],
        'ville': ['ville', 'habite', 'localisation', 'basé'],
        'style': ['style', 'technique', 'méthode', 'approche']
      }
    },
    oeuvres: {
      keywords: [
        'oeuvre', 'tableau', 'peinture', 'sculpture', 'création',
        'collection', 'galerie', 'exposition', 'montrez'
      ],
      attributes: {
        'titre': ['titre', 'nommé', 'appelé', 'nom'],
        'prix': ['prix', 'coûte', 'valeur', 'euros', 'vendu pour'],
        'année': ['année', 'date', 'créé', 'réalisé'],
        'statut': ['disponible', 'vendu', 'réservé', 'état']
      }
    },
    ventes: {
      keywords: [
        'vente', 'transaction', 'achat', 'vendu', 'revenus',
        'combien', 'montant', 'chiffre'
      ],
      attributes: {
        'date': ['quand', 'date', 'période', 'mois', 'année'],
        'prix': ['prix', 'montant', 'euros', 'somme'],
        'client': ['qui', 'acheteur', 'client', 'acquéreur']
      }
    }
  };

  // Extract intent and context
  const intent = {
    collection: null,
    attributes: [],
    filters: {},
    timeframe: extractTimeframe(query),
    sorting: extractSorting(query)
  };

  // Determine primary collection
  for (const [collection, patterns] of Object.entries(queryPatterns)) {
    if (patterns.keywords.some(keyword => query.toLowerCase().includes(keyword))) {
      intent.collection = collection;
      
      // Extract attributes and filters
      for (const [attr, keywords] of Object.entries(patterns.attributes)) {
        if (keywords.some(keyword => query.toLowerCase().includes(keyword))) {
          intent.attributes.push(attr);
        }
      }
      break;
    }
  }

  return intent;
};

const formatNaturalResponse = (results, query, collection) => {
  if (!results || results.length === 0) {
    return `Je suis désolé(e), mais je n'ai pas trouvé d'informations correspondant à votre demande concernant ${translateCollection(collection)}.
    
Puis-je reformuler votre recherche différemment ?`;
  }

  // Format responses based on collection and query type
  const response = {
    greeting: 'Voici ce que j\'ai trouvé :',
    mainContent: '',
    details: '',
    followUp: ''
  };

  switch (collection) {
    case 'artistes':
      return formatArtistResponse(results, query, response);
    case 'oeuvres':
      return formatArtworkResponse(results, query, response);
    case 'ventes':
      return formatSaleResponse(results, query, response);
    default:
      return formatGenericResponse(results, collection, response);
  }
};

const formatArtistResponse = (results, query, response) => {
  if (results.length === 1) {
    const artist = results[0];
    response.mainContent = `J'ai trouvé les informations sur l'artiste ${artist.prenom} ${artist.nom}.
    
${artist.statut ? `Statut : ${artist.statut}` : ''}
${artist.ville ? `Basé(e) à ${artist.ville}` : ''}
${artist.commentaires ? `\nNote : ${artist.commentaires}` : ''}`;

    response.followUp = `\nSouhaitez-vous voir les œuvres de cet artiste ?`;
  } else {
    response.mainContent = `J'ai trouvé ${results.length} artistes correspondant à votre recherche :\n\n` +
      results.map(artist => 
        `• ${artist.prenom} ${artist.nom}${artist.ville ? ` (${artist.ville})` : ''}`
      ).join('\n');

    response.followUp = `\nSouhaitez-vous des informations détaillées sur l'un de ces artistes ?`;
  }

  return Object.values(response).filter(Boolean).join('\n\n');
};

// Add helper functions for French formatting
const formatFrenchNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
};

const formatFrenchDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const translateCollection = (collection) => {
  const translations = {
    artistes: 'les artistes',
    oeuvres: 'les œuvres',
    ventes: 'les ventes',
    clients: 'les clients'
  };
  return translations[collection] || collection;
};

// Update the socket connection handler
io.on('connection', (socket) => {
  console.log('Client connecté');

  socket.on('chat message', async (data) => {
    try {
      const { content, sessionId, collections } = data;
      
      // Validate input
      if (!content || !sessionId || !collections) {
        throw new Error('Paramètres manquants');
      }

      const response = await chatWithBot(sessionId, content, collections);
      
      socket.emit('chat response', {
        response: response.response,
        dbResults: response.dbResults,
        collections: response.collections
      });
    } catch (error) {
      console.error('Chat error:', error);
      socket.emit('error', { 
        message: error.message || 'Désolé, une erreur est survenue lors du traitement de votre demande.' 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client déconnecté');
  });
});

// New helper functions for French art-specific formatting
const formatFrenchArtResponse = (results, query, collection) => {
  const response = {
    greeting: 'Bonjour,\n\n',
    content: '',
    details: '',
    closing: '\n\nPuis-je vous apporter d\'autres précisions ?'
  };

  switch (collection) {
    case 'artistes':
      response.content = formatFrenchArtistResponse(results);
      break;
    case 'oeuvres':
      response.content = formatFrenchArtworkResponse(results);
      break;
    case 'ventes':
      response.content = formatFrenchSalesResponse(results);
      break;
    default:
      response.content = formatFrenchGeneralResponse(results);
  }

  return `${response.greeting}${response.content}${response.details}${response.closing}`;
};

const formatFrenchArtistResponse = (results) => {
  if (results.length === 1) {
    const artiste = results[0];
    return `J'ai trouvé les informations concernant l'artiste ${artiste.prenom} ${artiste.nom} :

• Statut : ${artiste.statut || 'Non spécifié'}
• Localisation : ${artiste.ville || 'Non spécifiée'}
${artiste.technique ? `• Technique privilégiée : ${artiste.technique}` : ''}
${artiste.commentaires ? `\nNote : ${artiste.commentaires}` : ''}`;
  }

  return `J'ai trouvé ${results.length} artistes correspondant à votre recherche :

${results.map((artiste, index) => 
    `${index + 1}. ${artiste.prenom} ${artiste.nom}${artiste.ville ? ` (${artiste.ville})` : ''}`
  ).join('\n')}`;
};

const formatFrenchArtworkResponse = (results) => {
  if (results.length === 1) {
    const oeuvre = results[0];
    return `Voici les détails de l'œuvre « ${oeuvre.titre} » :

• Création : ${oeuvre.anneeCreation || 'Date non spécifiée'}
• Technique : ${oeuvre.technique || 'Non spécifiée'}
• Dimensions : ${oeuvre.dimensions || 'Non spécifiées'}
• Statut : ${translateArtworkStatus(oeuvre.statut)}
${oeuvre.prixVente ? `• Prix : ${formatFrenchPrice(oeuvre.prixVente)}` : ''}`;
  }

  return `J'ai trouvé ${results.length} œuvres correspondant à votre recherche :

${results.map((oeuvre, index) => 
    `${index + 1}. « ${oeuvre.titre} » (${oeuvre.anneeCreation || 'Date non spécifiée'})`
  ).join('\n')}`;
};

const translateArtworkStatus = (status) => {
  const statusMap = {
    'available': 'Disponible',
    'sold': 'Vendue',
    'reserved': 'Réservée'
  };
  return statusMap[status] || status;
};

const formatFrenchPrice = (price) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

// Add these helper functions to your existing code
const detectEnglishLanguage = (text) => {
  // Simple detection based on common English words
  const englishWords = ['the', 'is', 'are', 'what', 'who', 'where', 'when', 'how'];
  const words = text.toLowerCase().split(' ');
  return words.some(word => englishWords.includes(word));
};

const translateToFrench = async (text) => {
  // Implement translation logic here
  // For now, return original text
  return text;
};

// Create the server instance
const serverInstance = http.createServer(app);

// Add error handling for the server
serverInstance.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying to close existing connection...`);
    
    // Try to close any existing connection
    require('child_process').exec(`lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (err) => {
      if (err) {
        console.error('Could not free up port:', err);
        process.exit(1);
      }
      
      // Retry starting the server
      console.log('Retrying to start server...');
      serverInstance.listen(PORT);
    });
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Update the startServer function
const startServer = async () => {
  try {
    await connectDB();
    
    // Add a check if port is in use before starting
    const isPortAvailable = await new Promise((resolve) => {
      const testServer = http.createServer();
      testServer.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        }
      });
      testServer.once('listening', () => {
        testServer.close();
        resolve(true);
      });
      testServer.listen(PORT);
    });

    if (!isPortAvailable) {
      console.log(`Port ${PORT} is in use, attempting to free it...`);
      await new Promise((resolve, reject) => {
        require('child_process').exec(`lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    serverInstance.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Add graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close the server first to stop accepting new connections
    await new Promise((resolve, reject) => {
      serverInstance.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    // Then close MongoDB connection
    await mongoose.connection.close();
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

// Update process handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

// Add connection error handlers
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB connection closure:', err);
    process.exit(1);
  }
});

const determineCollections = (query, activeCollections) => {
  const keywords = {
    artistes: [
      'artiste', 'artist', 'créateur', 'creator', 'auteur',
      'peintre', 'sculpteur', 'photographe'
    ],
    oeuvres: [
      'oeuvre', 'artwork', 'piece', 'tableau', 'sculpture',
      'photo', 'création', 'exposition'
    ],
    ventes: [
      'vente', 'sale', 'transaction', 'revenue', 'achat',
      'prix', 'commission', 'paiement'
    ],
    clients: [
      'client', 'acheteur', 'buyer', 'collectionneur',
      'collector', 'contact', 'prospect'
    ]
  };

  // Check for explicit collection mentions
  const mentionedCollections = activeCollections.filter(collection => 
    query.toLowerCase().includes(collection.toLowerCase())
  );

  if (mentionedCollections.length > 0) {
    return mentionedCollections;
  }

  // Check for keyword matches
  return activeCollections.filter(collection => 
    keywords[collection]?.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    )
  );
};

const determineDataType = (results) => {
  if (!results || results.length === 0) return 'empty';
  
  const firstRecord = results[0];
  
  // Check for date fields
  const hasDate = Object.entries(firstRecord).some(([key, value]) => 
    key.toLowerCase().includes('date') && value instanceof Date
  );
  
  // Check for numerical fields
  const hasNumbers = Object.entries(firstRecord).some(([key, value]) => 
    ['prixVente', 'commission', 'montant'].includes(key) && 
    typeof value === 'number'
  );
  
  if (hasDate) return 'temporal';
  if (hasNumbers) return 'numerical';
  return 'textual';
};

const formatErrorMessage = (error, collections) => {
  return {
    message: `Je suis désolé, une erreur s'est produite : ${error.message}`,
    suggestion: 'Voici les collections disponibles :\n' +
      collections.map(c => `- ${translateCollection(c)}`).join('\n') +
      '\n\nQue souhaitez-vous consulter ?'
  };
};

const translateErrorType = (errorType) => {
  const errorTranslations = {
    'not_found': 'Information non trouvée',
    'invalid_query': 'Requête invalide',
    'database_error': 'Erreur de base de données',
    'connection_error': 'Erreur de connexion'
  };
  return errorTranslations[errorType] || 'Erreur inconnue';
};
