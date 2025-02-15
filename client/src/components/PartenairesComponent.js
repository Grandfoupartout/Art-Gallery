import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from './shared/DataTable';
import { useTheme } from '../context/ThemeContext';
import { handleComponentRefresh, handleComponentError } from '../utils/componentUtils';

const PartenairesComponent = () => {
  const [partenaires, setPartenaires] = useState([]);
  const [editingPartenaire, setEditingPartenaire] = useState(null);
  const [newPartenaire, setNewPartenaire] = useState({
    nom: '',
    type: '',
    coordonnees: '',
    datePartenariat: '',
    conditions: '',
    commentaires: ''
  });
  const [error, setError] = useState('');
  const { theme } = useTheme();

  // Add type options constant
  const typeOptions = [
    { value: 'gallery', label: 'Galerie' },
    { value: 'museum', label: 'Musée' },
    { value: 'collector', label: 'Collectionneur' },
    { value: 'other', label: 'Autre' }
  ];

  useEffect(() => {
    fetchPartenaires();
  }, []);

  const fetchPartenaires = async () => {
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/partenaires');
      setPartenaires(response.data);
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingPartenaire) {
      setEditingPartenaire({ ...editingPartenaire, [name]: value });
    } else {
      setNewPartenaire({ ...newPartenaire, [name]: value });
    }
    setError('');
  };

  const validateForm = () => {
    const requiredFields = {
      nom: 'Nom',
      type: 'Type',
      coordonnees: 'Coordonnées'
    };

    const formData = editingPartenaire || newPartenaire;

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !formData[key])
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      setError(`Veuillez remplir les champs obligatoires: ${missingFields.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (editingPartenaire) {
        const response = await axios.put(
          `http://localhost:5000/api/partenaires/${editingPartenaire._id}`,
          editingPartenaire
        );
        setPartenaires(prevPartenaires =>
          prevPartenaires.map(p => (p._id === editingPartenaire._id ? response.data : p))
        );
        setEditingPartenaire(null);
      } else {
        const response = await axios.post('http://localhost:5000/api/partenaires', newPartenaire);
        setPartenaires(prevPartenaires => [...prevPartenaires, response.data]);
        setNewPartenaire({
          nom: '',
          type: '',
          coordonnees: '',
          datePartenariat: '',
          conditions: '',
          commentaires: ''
        });
      }
      setError('');
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  const handleEdit = (partenaire) => {
    setEditingPartenaire(partenaire);
    setNewPartenaire(partenaire);
  };

  const handleDelete = async (partenaire) => {
    try {
      await axios.delete(`http://localhost:5000/api/partenaires/${partenaire._id}`);
      setPartenaires(prevPartenaires => prevPartenaires.filter(p => p._id !== partenaire._id));
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  const refreshData = () => {
    handleComponentRefresh(fetchPartenaires, setError);
  };

  const columns = [
    { key: 'nom', label: 'Nom' },
    { key: 'type', label: 'Type' },
    { key: 'coordonnees', label: 'Coordonnées' },
    { 
      key: 'datePartenariat', 
      label: 'Date de Partenariat',
      render: (value) => value ? new Date(value).toLocaleDateString() : ''
    },
    { key: 'conditions', label: 'Conditions' },
    { key: 'commentaires', label: 'Commentaires' }
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
        alignItems: 'center'
      }}>
        <h2 style={{ 
          color: theme.colors.text, 
          margin: 0, 
          padding: '10px'
        }}>
          Gestion des Partenaires
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '15px',
          alignItems: 'end'
        }}>
          <input
            type="text"
            name="nom"
            placeholder="Nom du partenaire *"
            value={newPartenaire.nom}
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

          <select
            name="type"
            value={newPartenaire.type}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Type de partenaire</option>
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="coordonnees"
            placeholder="Coordonnées *"
            value={newPartenaire.coordonnees}
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
            type="date"
            name="datePartenariat"
            value={newPartenaire.datePartenariat}
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
            name="conditions"
            placeholder="Conditions"
            value={newPartenaire.conditions}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <textarea
            name="commentaires"
            placeholder="Commentaires"
            value={newPartenaire.commentaires}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text,
              minHeight: '100px',
              resize: 'vertical'
            }}
          />

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
              transition: 'opacity 0.2s'
            }}
          >
            {editingPartenaire ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </form>
      </div>

      <DataTable
        data={partenaires}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Rechercher un partenaire..."
        initialSortColumn="nom"
        onRefresh={refreshData}
      />
    </div>
  );
};

export default PartenairesComponent;