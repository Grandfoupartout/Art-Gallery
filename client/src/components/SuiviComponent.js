import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SuiviComponent = () => {
  const [suivis, setSuivis] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriorite, setFilterPriorite] = useState('');
  const [editingSuivi, setEditingSuivi] = useState(null);
  const [newSuivi, setNewSuivi] = useState({
    id: '',
    idClient: '',
    dateContact: '',
    typeContact: '',
    contenu: '',
    suite: '',
    rappel: '',
    statut: '',
    priorite: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSuivis();
    fetchClients();
  }, []);

  const fetchSuivis = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/suivis');
      setSuivis(response.data);
    } catch (error) {
      setError('Erreur lors du chargement des suivis: ' + error.message);
      console.error('Error fetching suivis:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const resetForm = () => {
    setNewSuivi({
      id: '',
      idClient: '',
      dateContact: '',
      typeContact: '',
      contenu: '',
      suite: '',
      rappel: '',
      statut: '',
      priorite: ''
    });
    setEditingSuivi(null);
    setError('');
  };

  const handleInputChange = (e) => {
    setError('');
    const { name, value } = e.target;
    
    // Validation spécifique pour les dates
    if ((name === 'dateContact' || name === 'rappel') && value) {
      const selectedDate = new Date(value);
      if (isNaN(selectedDate.getTime())) {
        setError('Date invalide');
        return;
      }
    }

    setNewSuivi({ ...newSuivi, [name]: value });
    console.log('Current form data:', { ...newSuivi, [name]: value }); // Debug log
  };

  const handleAddSuivi = async () => {
    try {
      // Validation améliorée
      if (!newSuivi.idClient) {
        setError('Veuillez sélectionner un client');
        return;
      }
      if (!newSuivi.dateContact) {
        setError('La date de contact est requise');
        return;
      }
      if (!newSuivi.typeContact) {
        setError('Le type de contact est requis');
        return;
      }

      // Format the data before sending
      const suiviData = {
        ...newSuivi,
        dateContact: new Date(newSuivi.dateContact).toISOString(),
        rappel: newSuivi.rappel ? new Date(newSuivi.rappel).toISOString() : null,
        // Ensure these fields have default values if empty
        statut: newSuivi.statut || 'En cours',
        priorite: newSuivi.priorite || 'Moyenne'
      };

      const response = await axios.post('http://localhost:5000/api/suivis', suiviData);
      setSuivis([...suivis, response.data]);
      resetForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      setError(`Erreur lors de l'ajout du suivi: ${errorMessage}`);
      console.error('Error adding suivi:', error);
    }
  };

  const handleDeleteSuivi = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce suivi ?')) {
      try {
        await axios.delete(`http://localhost:5000/api/suivis/${id}`);
        setSuivis(suivis.filter(suivi => suivi.id !== id));
      } catch (error) {
        setError('Erreur lors de la suppression du suivi: ' + error.message);
      }
    }
  };

  const handleEditClick = (suivi) => {
    setEditingSuivi(suivi);
    setNewSuivi({ ...suivi });
  };

  const handleUpdateSuivi = async () => {
    try {
      // Validation améliorée
      if (!newSuivi.idClient || !newSuivi.dateContact || !newSuivi.typeContact) {
        setError('Le client, la date et le type de contact sont obligatoires');
        return;
      }

      const response = await axios.put(
        `http://localhost:5000/api/suivis/${editingSuivi.id}`, 
        newSuivi
      );
      
      setSuivis(suivis.map(s => s.id === editingSuivi.id ? response.data : s));
      resetForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      setError(`Erreur lors de la mise à jour: ${errorMessage}`);
      console.error('Error updating suivi:', error);
    }
  };

  const filteredSuivis = suivis
    .filter(suivi => {
      const clientName = suivi.idClient?.nom || '';
      const content = suivi.contenu || '';
      const searchLower = searchTerm.toLowerCase();
      
      return clientName.toLowerCase().includes(searchLower) ||
             content.toLowerCase().includes(searchLower);
    })
    .filter(suivi => !filterPriorite || suivi.priorite === filterPriorite);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Suivi des Contacts</h2>
      
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Rechercher un suivi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid #ddd',
            flex: 1
          }}
        />
        <select
          value={filterPriorite}
          onChange={(e) => setFilterPriorite(e.target.value)}
          style={{ 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid #ddd'
          }}
        >
          <option value="">Toutes les priorités</option>
          <option value="Haute">Haute</option>
          <option value="Moyenne">Moyenne</option>
          <option value="Basse">Basse</option>
        </select>
      </div>

      <form style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <select
            name="idClient"
            value={newSuivi.idClient}
            onChange={handleInputChange}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Client *</option>
            {clients.map(client => (
              <option key={client._id} value={client._id}>{client.nom}</option>
            ))}
          </select>
          <input 
            type="date" 
            name="dateContact" 
            value={newSuivi.dateContact} 
            onChange={handleInputChange} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
          />
          <select
            name="typeContact"
            value={newSuivi.typeContact}
            onChange={handleInputChange}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Type *</option>
            <option value="Email">Email</option>
            <option value="Téléphone">Téléphone</option>
            <option value="Rendez-vous">Rendez-vous</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <textarea 
          name="contenu" 
          placeholder="Contenu de l'échange" 
          value={newSuivi.contenu} 
          onChange={handleInputChange} 
          style={{ 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid #ddd',
            height: '80px',
            resize: 'vertical',
            gridColumn: '1 / span 2'
          }} 
        />

        <div style={{ display: 'grid', gap: '10px' }}>
          <select
            name="priorite"
            value={newSuivi.priorite}
            onChange={handleInputChange}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Priorité</option>
            <option value="Haute">Haute</option>
            <option value="Moyenne">Moyenne</option>
            <option value="Basse">Basse</option>
          </select>
          <select
            name="statut"
            value={newSuivi.statut}
            onChange={handleInputChange}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Statut</option>
            <option value="En cours">En cours</option>
            <option value="Terminé">Terminé</option>
            <option value="En attente">En attente</option>
          </select>
        </div>

        <textarea 
          name="suite" 
          placeholder="Suite à donner" 
          value={newSuivi.suite} 
          onChange={handleInputChange} 
          style={{ 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid #ddd',
            height: '80px',
            resize: 'vertical',
            gridColumn: '1 / span 2'
          }} 
        />

        <div style={{ display: 'grid', gap: '10px' }}>
          <input 
            type="date" 
            name="rappel" 
            placeholder="Date de rappel" 
            value={newSuivi.rappel} 
            onChange={handleInputChange} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
          />
          <button 
            type="button" 
            onClick={editingSuivi ? handleUpdateSuivi : handleAddSuivi}
            style={{
              padding: '8px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer'
            }}
          >
            {editingSuivi ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Client</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type Contact</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Contenu</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Statut</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Priorité</th>
            <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredSuivis.map((suivi) => (
            <tr key={suivi.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '8px' }}>{formatDate(suivi.dateContact)}</td>
              <td style={{ padding: '8px' }}>{suivi.idClient?.nom || 'Client inconnu'}</td>
              <td style={{ padding: '8px' }}>{suivi.typeContact}</td>
              <td style={{ padding: '8px' }}>{suivi.contenu}</td>
              <td style={{ padding: '8px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: suivi.statut === 'Terminé' ? '#4CAF50' : 
                                 suivi.statut === 'En cours' ? '#FFA500' : '#808080',
                  color: 'white'
                }}>
                  {suivi.statut || 'Non défini'}
                </span>
              </td>
              <td style={{ padding: '8px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: suivi.priorite === 'Haute' ? '#FF6B6B' :
                                 suivi.priorite === 'Moyenne' ? '#FFD93D' : '#6BCB77',
                  color: suivi.priorite === 'Moyenne' ? 'black' : 'white'
                }}>
                  {suivi.priorite || 'Non définie'}
                </span>
              </td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                <button 
                  onClick={() => handleEditClick(suivi)} 
                  style={{ padding: '5px 10px', backgroundColor: '#FFD700', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                >
                  Éditer
                </button>
                <button 
                  onClick={() => handleDeleteSuivi(suivi.id)} 
                  style={{ padding: '5px 10px', backgroundColor: '#FF6347', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SuiviComponent;
