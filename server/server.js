const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/galerie', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
  nom: String,
  coordonnees: String,
  categorie: String,
  historiqueAchats: String,
  derniereRelance: Date,
  commentaires: String,
  dateDernierContact: Date,
});

clientSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `C${await getNextSequence('client_id')}`;
  }
  next();
});

const artisteSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  nom: String,
  statut: String,
  coordonnees: String,
  dateIntegration: Date,
  commentaires: String,
  lienCatalogue: String,
});

artisteSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `A${await getNextSequence('artiste_id')}`;
  }
  next();
});

const budgetSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  date: Date,
  categorie: String,
  description: String,
  montant: Number,
});

budgetSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `B${await getNextSequence('budget_id')}`;
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
  date: Date,
  idClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  idOeuvre: { type: mongoose.Schema.Types.ObjectId, ref: 'Oeuvre' },
  prixVente: Number,
  commission: Number,
  modePaiement: String,
  commentaires: String,
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
    const clients = await Client.find();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clients' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { id, ...clientData } = req.body;
    const newClient = new Client(clientData);
    await newClient.save();
    res.json(newClient);
  } catch (error) {
    res.status(400).json({ message: 'Error adding client', error: error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedClient) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }
    res.json(updatedClient);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la modification du client',
      error: error.message
    });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const deletedClient = await Client.findByIdAndDelete(req.params.id);
    if (!deletedClient) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }
    res.json({ message: 'Client supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du client', error: error.message });
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
    const budgets = await Budget.find();
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching budget' });
  }
});

app.post('/api/budget', async (req, res) => {
  try {
    const { id, ...budgetData } = req.body;
    const newBudget = new Budget(budgetData);
    await newBudget.save();
    res.json(newBudget);
  } catch (error) {
    res.status(400).json({ message: 'Error adding budget entry', error: error.message });
  }
});

app.put('/api/budget/:id', async (req, res) => {
  try {
    const updatedBudget = await Budget.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedBudget) {
      return res.status(404).json({ message: 'Entrée budgétaire non trouvée' });
    }

    res.json(updatedBudget);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification de l\'entrée budgétaire', error: error.message });
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
    const ventes = await Vente.find().populate('idClient').populate('idOeuvre');
    res.json(ventes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ventes' });
  }
});

app.post('/api/ventes', async (req, res) => {
  try {
    const { id, ...venteData } = req.body;
    const newVente = new Vente(venteData);
    await newVente.save();
    res.json(newVente);
  } catch (error) {
    res.status(400).json({ message: 'Error adding vente', error: error.message });
  }
});

app.put('/api/ventes/:id', async (req, res) => {
  try {
    // Create a copy of the request body and ensure date is properly handled
    const updateData = { ...req.body };
    if (updateData.dateVente) {
      updateData.dateVente = new Date(updateData.dateVente);
    }

    const updatedVente = await Vente.findOneAndUpdate(
      { _id: req.params.id },
      updateData,
      { new: true }
    ).populate('idClient').populate('idOeuvre');

    if (!updatedVente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }

    res.json(updatedVente);
  } catch (error) {
    console.error('Error updating vente:', error);
    res.status(400).json({
      message: 'Erreur lors de la mise à jour de la vente',
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
