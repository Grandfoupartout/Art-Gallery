import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from './shared/DataTable';
import { useTheme } from '../context/ThemeContext';
import { handleComponentRefresh, handleComponentError } from '../utils/componentUtils';

const ArtistesComponent = () => {
  const [artistes, setArtistes] = useState([]);
  const [editingArtiste, setEditingArtiste] = useState(null);
  const [newArtiste, setNewArtiste] = useState({
    nom: '',
    statut: '',
    coordonnees: '',
    dateIntegration: '',
    commentaires: '',
    lienCatalogue: ''
  });
  const [error, setError] = useState('');

  const { theme } = useTheme();

  // Add status options constant
  const statusOptions = [
    { value: 'portfolio', label: 'In Portfolio' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'represented', label: 'Represented' },
    { value: 'archived', label: 'Archived' }
  ];

  useEffect(() => {
    fetchArtistes();
  }, []);

  const refreshData = () => {
    handleComponentRefresh(fetchArtistes, setError);
  };

  const fetchArtistes = async () => {
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/artistes');
      setArtistes(response.data);
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingArtiste) {
      setEditingArtiste({ ...editingArtiste, [name]: value });
    } else {
      setNewArtiste({ ...newArtiste, [name]: value });
    }
  };

  const handleEdit = async (artiste) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/artistes/${artiste._id}`, 
        artiste
      );
      setArtistes(prevArtistes => 
        prevArtistes.map(a => a._id === artiste._id ? response.data : a)
      );
      setEditingArtiste(null);
    } catch (error) {
      setError('Erreur lors de la modification: ' + error.message);
    }
  };

  const handleDelete = async (artiste) => {
    try {
      await axios.delete(`http://localhost:5000/api/artistes/${artiste._id}`);
      setArtistes(prevArtistes => 
        prevArtistes.filter(a => a._id !== artiste._id)
      );
    } catch (error) {
      setError('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (editingArtiste) {
        const response = await axios.put(
          `http://localhost:5000/api/artistes/${editingArtiste._id}`,
          editingArtiste
        );
        setArtistes(prevArtistes =>
          prevArtistes.map(a => a._id === editingArtiste._id ? response.data : a)
        );
        setEditingArtiste(null);
      } else {
        const response = await axios.post('http://localhost:5000/api/artistes', newArtiste);
        setArtistes([...artistes, response.data]);
        setNewArtiste({
          nom: '',
          statut: '',
          coordonnees: '',
          dateIntegration: '',
          commentaires: '',
          lienCatalogue: ''
        });
      }
      setError('');
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  const validateForm = () => {
    const requiredFields = {
      nom: 'Nom',
      statut: 'Statut',
      dateIntegration: 'Date d\'intégration'
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !newArtiste[key])
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      setError(`Veuillez remplir les champs obligatoires: ${missingFields.join(', ')}`);
      return false;
    }
    return true;
  };

  const columns = [
    { key: 'nom', label: 'Nom' },
    { 
      key: 'statut', 
      label: 'Statut',
      type: 'select',
      options: statusOptions,
      render: (value, row, isEditing) => {
        if (!isEditing) {
          return statusOptions.find(opt => opt.value === value)?.label || value;
        }
        return (
          <select
            value={value || ''}
            onChange={(e) => handleInputChange(e, row)}
            name="statut"
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Sélectionner un statut</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }
    },
    { key: 'coordonnees', label: 'Coordonnées' },
    { 
      key: 'dateIntegration', 
      label: 'Date d\'intégration',
      render: (value) => value ? new Date(value).toLocaleDateString() : ''
    },
    { key: 'commentaires', label: 'Commentaires' },
    { 
      key: 'lienCatalogue', 
      label: 'Catalogue',
      render: (value) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer">
          Voir le catalogue
        </a>
      ) : ''
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
        alignItems: 'center'
      }}>
        <h2 style={{ 
          color: theme.colors.text, 
          margin: 0, 
          padding:'10px'
        }}>
          Gestion des Artistes
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
            placeholder="Nom de l'artiste *"
            value={newArtiste.nom}
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
            name="statut"
            value={newArtiste.statut}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
            required
          >
            <option value="">Statut *</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="tel"
            name="coordonnees"
            placeholder="Coordonnées"
            value={newArtiste.coordonnees}
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
            name="dateIntegration"
            placeholder="Date d'intégration"
            value={newArtiste.dateIntegration}
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
            value={newArtiste.commentaires}
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
            type="url"
            name="lienCatalogue"
            placeholder="Lien Catalogue"
            value={newArtiste.lienCatalogue}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
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
            {editingArtiste ? 'Mettre à jour' : 'Ajouter'}
          </button>

          {editingArtiste && (
            <button
              type="button"
              onClick={() => {
                setEditingArtiste(null);
                setNewArtiste({
                  nom: '',
                  statut: '',
                  coordonnees: '',
                  dateIntegration: '',
                  commentaires: '',
                  lienCatalogue: ''
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
          data={artistes}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="Rechercher un artiste..."
          initialSortColumn="nom"
          onRefresh={refreshData}
        />
      </div>
    </div>
  );
};

export default ArtistesComponent;
