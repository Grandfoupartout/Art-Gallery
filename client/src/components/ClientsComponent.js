import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from './shared/DataTable'; // Ensure this component exists or create it
import { useTheme } from '../context/ThemeContext';
import { handleComponentRefresh, handleComponentError } from '../utils/componentUtils';

const ClientsComponent = () => {
  const [clients, setClients] = useState([]);
  const [editingClient, setEditingClient] = useState(null);
  const [newClient, setNewClient] = useState({
    nom: '',
    coordonnees: '',
    categorie: '',
    idPartenaire: '',
    historiqueAchats: '',
    derniereRelance: '',
    commentaires: '',
    dateDernierContact: ''
  });
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const [partenaires, setPartenaires] = useState([]);

  const categoryOptions = [
    { value: 'vip', label: 'VIP' },
    { value: 'regular', label: 'Régulier' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'inactive', label: 'Inactif' }
  ];

  useEffect(() => {
    fetchClients();
    fetchPartenaires();
  }, []);

  const fetchClients = async () => {
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/clients');
      setClients(response.data);
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  const fetchPartenaires = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/partenaires');
      setPartenaires(response.data);
    } catch (error) {
      setError('Erreur lors du chargement des partenaires: ' + error.message);
    }
  };

  const handleInputChange = (e, client = null) => {
    const { name, value } = e.target;
    
    if (client) {
      // Editing existing client
      setClients(prevClients =>
        prevClients.map(c =>
          c._id === client._id ? { ...c, [name]: value } : c
        )
      );
    } else {
      // Adding new client
      setNewClient(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  const handleEdit = async (client) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/clients/${client._id}`,
        client
      );
      setClients(prevClients =>
        prevClients.map(c => c._id === client._id ? response.data : c)
      );
      setEditingClient(null);
    } catch (error) {
      setError('Erreur lors de la modification: ' + error.message);
    }
  };

  const handleDelete = async (client) => {
    try {
      await axios.delete(`http://localhost:5000/api/clients/${client._id}`);
      setClients(prevClients =>
        prevClients.filter(c => c._id !== client._id)
      );
    } catch (error) {
      setError('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/clients', newClient);
      setClients([...clients, response.data]);
      setNewClient({
        nom: '',
        coordonnees: '',
        categorie: '',
        idPartenaire: '',
        historiqueAchats: '',
        derniereRelance: '',
        commentaires: '',
        dateDernierContact: ''
      });
      setError('');
    } catch (error) {
      setError('Erreur lors de l\'ajout du client: ' + error.message);
    }
  };

  const refreshData = () => {
    handleComponentRefresh(fetchClients, setError);
  };

  const handleSendEmail = async (client) => {
    // Logic to send an email to name@email.com
    console.log(`Sending email to ${client.nom} at name@email.com`);
  };

  useEffect(() => {
    const checkDates = () => {
      const now = new Date();
      clients.forEach(client => {
        const lastContactDate = new Date(client.dateDernierContact);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        if (lastContactDate < sixMonthsAgo) {
          handleSendEmail(client);
        }
      });
    };

    checkDates();
  }, [clients]);

  const columns = [
    { 
      key: 'nom', 
      label: 'Nom',
      required: true 
    },
    { 
      key: 'email', 
      label: 'Email' 
    },
    { 
      key: 'telephone', 
      label: 'Téléphone' 
    },
    { 
      key: 'adresse', 
      label: 'Adresse' 
    },
    {
      key: 'categorie',
      label: 'Catégorie',
      type: 'select',
      options: categoryOptions,
      render: (value, row, isEditing) => {
        if (!isEditing) {
          const option = categoryOptions.find(opt => opt.value === value);
          return option ? option.label : value || 'Non défini';
        }

        return (
          <select
            name="categorie"
            value={value || ''}
            onChange={(e) => handleInputChange(e, row)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text,
              width: '100%'
            }}
          >
            <option value="">Sélectionner une catégorie</option>
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'idPartenaire',
      label: 'Partenaire',
      type: 'select',
      options: partenaires.map(p => ({ value: p._id, label: p.nom })),
      render: (value, row, isEditing) => {
        if (!isEditing) {
          const partenaire = partenaires.find(p => p._id === value);
          return partenaire ? partenaire.nom : 'Non assigné';
        }

        return (
          <select
            name="idPartenaire"
            value={value || ''}
            onChange={(e) => handleInputChange(e, row)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text,
              width: '100%'
            }}
          >
            <option value="">Sélectionner un partenaire</option>
            {partenaires.map(partenaire => (
              <option key={partenaire._id} value={partenaire._id}>
                {partenaire.nom}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'dateDernierContact',
      label: 'Dernier Contact',
      type: 'date',
      render: (value, row, isEditing) => {
        if (!isEditing) {
          if (!value) return 'Non défini';
          try {
            const date = new Date(value);
            return isNaN(date.getTime()) 
              ? 'Date invalide'
              : date.toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                });
          } catch (error) {
            return 'Date invalide';
          }
        }

        return (
          <input
            type="date"
            name="dateDernierContact"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange(e, row)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text,
              width: '100%'
            }}
          />
        );
      }
    },
    {
      key: 'derniereRelance',
      label: 'Dernière Relance',
      type: 'date',
      render: (value, row, isEditing) => {
        if (!isEditing) {
          if (!value) return 'Non défini';
          try {
            const date = new Date(value);
            return isNaN(date.getTime()) 
              ? 'Date invalide'
              : date.toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                });
          } catch (error) {
            return 'Date invalide';
          }
        }

        return (
          <input
            type="date"
            name="derniereRelance"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange(e, row)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text,
              width: '100%'
            }}
          />
        );
      }
    },
    { 
      key: 'commentaires', 
      label: 'Commentaires',
      render: (value, row, isEditing) => {
        if (!isEditing) return value || '';

        return (
          <textarea
            name="commentaires"
            value={value || ''}
            onChange={(e) => handleInputChange(e, row)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text,
              width: '100%',
              minHeight: '60px',
              resize: 'vertical'
            }}
          />
        );
      }
    }
  ];

  return (
    <div style={{ 
      width: '100%',
      maxWidth: '100%',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          color: theme.colors.text, 
          margin: 0 
        }}>
          Gestion des Clients
        </h2>
      </div>

      {error && (
        <div style={{ 
          color: theme.colors.danger, 
          marginBottom: '10px',
          padding: '10px',
          borderRadius: '4px',
          backgroundColor: `${theme.colors.danger}20`
        }}>
          {error}
        </div>
      )}

      <div style={{ 
        backgroundColor: theme.colors.surface,
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <form style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '15px',
          alignItems: 'end'
        }}>
          <input
            type="text"
            name="nom"
            placeholder="Nom du client"
            value={newClient.nom}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={newClient.email}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <input
            type="tel"
            name="telephone"
            placeholder="Téléphone"
            value={newClient.telephone}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <input
            type="text"
            name="adresse"
            placeholder="Adresse"
            value={newClient.adresse}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <input
            type="text"
            name="preferences"
            placeholder="Préférences"
            value={newClient.preferences}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <input
            type="date"
            name="dateDernierContact"
            placeholder="Date du dernier contact"
            value={newClient.dateDernierContact}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <input
            type="date"
            name="derniereRelance"
            placeholder="Date de dernière relance"
            value={newClient.derniereRelance}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <input
            type="text"
            name="commentaires"
            placeholder="Commentaires"
            value={newClient.commentaires}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <select
            name="idPartenaire"
            value={newClient.idPartenaire}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Sélectionner un partenaire</option>
            {partenaires.map(partenaire => (
              <option key={partenaire._id} value={partenaire._id}>
                {partenaire.nom}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSubmit}
            style={{
              padding: '10px',
              backgroundColor: theme.colors.success,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 0.9
              }
            }}
          >
            {editingClient ? 'Mettre à jour' : 'Ajouter'}
          </button>

          {editingClient && (
            <button
              type="button"
              onClick={() => {
                setEditingClient(null);
                setNewClient({
                  nom: '',
                  email: '',
                  telephone: '',
                  adresse: '',
                  preferences: '',
                  dateDernierContact: '',
                  derniereRelance: '',
                  commentaires: '',
                  idPartenaire: ''
                });
              }}
              style={{
                padding: '10px',
                backgroundColor: theme.colors.danger,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                '&:hover': {
                  opacity: 0.9
                }
              }}
            >
              Annuler
            </button>
          )}
        </form>
      </div>

      <div style={{ width: '100%' }}>
        <DataTable
          data={clients}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="Rechercher un client..."
          initialSortColumn="nom"
          onRefresh={refreshData}
        />
      </div>
    </div>
  );
};

export default ClientsComponent;
