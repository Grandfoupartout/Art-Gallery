import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from './shared/DataTable';
import { useTheme } from '../context/ThemeContext';
import { handleComponentRefresh, handleComponentError } from '../utils/componentUtils';

const OeuvresComponent = () => {
  const [oeuvres, setOeuvres] = useState([]);
  const [artistes, setArtistes] = useState([]);
  const [newOeuvre, setNewOeuvre] = useState({
    titre: '',
    idArtiste: '',
    anneeCreation: '',
    technique: '',
    dimensions: '',
    prixVente: '',
    reduction: '',
    propertyStatus: 'gallery',
    consignmentDuration: 'less3',
    availability: 'available',
    dateVente: '',
    commentaires: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();

  // Add new constants for dropdowns
  const statutOptions = [
    { value: 'available', label: 'Disponible' },
    { value: 'sold', label: 'Vendu' },
    { value: 'reserved', label: 'Réservé' }
  ];

  const propertyStatusOptions = [
    { value: 'gallery', label: '✅ Propriété de la galerie' },
    { value: 'consignment', label: '🔄 En consignation' },
    { value: 'other', label: '❌ Autre (prêt, donation, etc.)' }
  ];

  const consignmentDurationOptions = [
    { value: 'less3', label: '🗓️ Moins de 3 mois' },
    { value: '3to6', label: '📆 3 à 6 mois' },
    { value: 'more6', label: '📅 Plus de 6 mois' }
  ];

  const availabilityOptions = [
    { value: 'available', label: '🟢 Disponible à la vente' },
    { value: 'reserved', label: '🟠 Réservé' },
    { value: 'sold', label: '🔴 Vendu' }
  ];

  // Fetch artistes and oeuvres on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [artistesResponse, oeuvresResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/artistes'),
        axios.get('http://localhost:5000/api/oeuvres')
      ]);

      // Sort artistes by name for better display
      const sortedArtistes = artistesResponse.data.sort((a, b) => 
        a.nom.localeCompare(b.nom)
      );
      
      setArtistes(sortedArtistes);
      setOeuvres(oeuvresResponse.data);
    } catch (error) {
      handleComponentError(error, setError);
    } finally {
      setLoading(false);
    }
  };

  // Update handleInputChange to match ArtistesComponent.js pattern
  const handleInputChange = (e, oeuvre) => {
    const { name, value } = e.target;
    setOeuvres(prevOeuvres =>
      prevOeuvres.map(o =>
        o._id === oeuvre._id ? { ...o, [name]: value } : o
      )
    );
  };

  // Update handleEdit to allow sold status changes
  const handleEdit = async (oeuvre) => {
    try {
      // If changing to sold status, ensure date is set
      if (oeuvre.availability === 'sold' && !oeuvre.dateVente) {
        oeuvre.dateVente = new Date().toISOString().split('T')[0];
      }

      const response = await axios.put(
        `http://localhost:5000/api/oeuvres/${oeuvre._id}`,
        oeuvre
      );
      setOeuvres(prevOeuvres =>
        prevOeuvres.map(o => o._id === oeuvre._id ? response.data : o)
      );
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  // Fix columns definition for artist dropdown
  const columns = [
    { key: 'titre', label: 'Titre' },
    {
      key: 'idArtiste',
      label: 'Artiste',
      type: 'select',
      options: artistes.map(artiste => ({
        value: artiste._id,
        label: artiste.nom
      })),
      // This function ensures that in edit mode the value is the artist's _id string
      getValue: (value) => (value && typeof value === 'object' ? value._id : value),
      render: (value, row, isEditing) => {
        if (!isEditing) {
          const artiste = artistes.find(a => a._id === (value?._id || value));
          return artiste ? artiste.nom : 'Non défini';
        }
        // When editing, normalize the value for the <select> component
        const currentValue =
          row.idArtiste && typeof row.idArtiste === 'object'
            ? row.idArtiste._id
            : row.idArtiste;
        return (
          <select
            value={currentValue || ''}
            onChange={(e) => handleInputChange(e, row)}
            name="idArtiste"
          >
            <option value="">Sélectionner un artiste</option>
            {artistes.map(artiste => (
              <option key={artiste._id} value={artiste._id}>
                {artiste.nom}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'anneeCreation',
      label: 'Année',
      render: (value) => value || ''
    },
    { key: 'technique', label: 'Technique' },
    { key: 'dimensions', label: 'Dimensions' },
    { 
      key: 'prixVente', 
      label: 'Prix',
      render: (value) => value ? `${value}€` : ''
    },
    { 
      key: 'reduction', 
      label: 'Réduction',
      render: (value) => value ? `${value}%` : ''
    },
    {
      key: 'propertyStatus',
      label: 'Statut de propriété',
      type: 'select',
      options: propertyStatusOptions,
      render: (value, row, isEditing) => {
        if (!isEditing) {
          return propertyStatusOptions.find(opt => opt.value === value)?.label || 'Non défini';
        }
        return (
          <select
            value={value || ''}
            onChange={(e) => handleInputChange(e, row)}
            name="propertyStatus"
          >
            {propertyStatusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'consignmentDuration',
      label: 'Durée de consignation',
      type: 'select',
      options: consignmentDurationOptions,
      render: (value, row, isEditing) => {
        if (!isEditing) {
          return consignmentDurationOptions.find(opt => opt.value === value)?.label || 'Non défini';
        }
        return (
          <select
            value={value || ''}
            onChange={(e) => handleInputChange(e, row)}
            name="consignmentDuration"
          >
            {consignmentDurationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'availability',
      label: 'Disponibilité',
      type: 'select',
      options: availabilityOptions,
      render: (value, row, isEditing) => {
        if (!isEditing) {
          return availabilityOptions.find(opt => opt.value === value)?.label || 'Non défini';
        }
        return (
          <select
            value={value || ''}
            onChange={(e) => handleInputChange(e, row)}
            name="availability"
          >
            {availabilityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'dateVente',
      label: 'Date de vente',
      type: 'date',
      // This function will be used in edit mode by DataTable to format the value correctly.
      getValue: (value) => {
        if (!value) return '';
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        } catch (error) {
          return '';
        }
      },
      render: (value, row, isEditing) => {
        if (!isEditing) {
          if (!value) return 'Non défini';
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return 'Date invalide';
            return date.toLocaleDateString('fr-FR'); // Display as dd/mm/yyyy
          } catch (error) {
            return 'Date invalide';
          }
        }
      
        // This branch might not be used because DataTable uses its own input rendering in edit mode.
        let dateValue = '';
        if (value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            dateValue = date.toISOString().split('T')[0];
          }
        }
      
        return (
          <input
            type="date"
            name="dateVente"
            value={dateValue}
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
    }
    ,
    { key: 'commentaires', label: 'Commentaires' }
  ];
  
  // Add handleDelete function
  const handleDelete = async (oeuvre) => {
    try {
      // Ensure we have a valid ID
      if (!oeuvre._id) {
        setError('ID de l\'oeuvre invalide');
        return;
      }

      await axios.delete(`http://localhost:5000/api/oeuvres/${oeuvre._id}`);
      setOeuvres(prevOeuvres =>
        prevOeuvres.filter(o => o._id !== oeuvre._id)
      );
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  // Update the validateForm function
  const validateForm = () => {
    const requiredFields = {
      titre: 'Titre',
      idArtiste: 'Artiste',
      availability: 'Disponibilité',
      propertyStatus: 'Statut de propriété'
    };

    // If work is marked as sold, dateVente becomes required
    if (newOeuvre.availability === 'sold') {
      requiredFields.dateVente = 'Date de vente';
    }

    const formData = newOeuvre;

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !formData[key])
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      setError(`Veuillez remplir les champs obligatoires: ${missingFields.join(', ')}`);
      return false;
    }
    return true;
  };

  // Update handleSubmit to use validation
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (newOeuvre.availability === 'sold') {
        newOeuvre.dateVente = new Date().toISOString().split('T')[0];
      }
      const response = await axios.post('http://localhost:5000/api/oeuvres', newOeuvre);
      setOeuvres(prevOeuvres => [...prevOeuvres, response.data]);
      setNewOeuvre({
        titre: '',
        idArtiste: '',
        anneeCreation: '',
        technique: '',
        dimensions: '',
        prixVente: '',
        reduction: '',
        propertyStatus: 'gallery',
        consignmentDuration: 'less3',
        availability: 'available',
        dateVente: '',
        commentaires: ''
      });
      setError('');
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

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
          Gestion des Œuvres
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
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        width: '100%'
      }}>
        <form style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '15px',
          alignItems: 'end'
        }}>
          <input
            type="text"
            name="titre"
            placeholder="Titre *"
            value={newOeuvre.titre}
            onChange={(e) => handleInputChange(e, newOeuvre)}
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
            type="number"
            name="anneeCreation"
            placeholder="Année de création"
            value={newOeuvre.anneeCreation}
            onChange={(e) => handleInputChange(e, newOeuvre)}
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
            name="technique"
            placeholder="Technique"
            value={newOeuvre.technique}
            onChange={(e) => handleInputChange(e, newOeuvre)}
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
            name="dimensions"
            placeholder="Dimensions"
            value={newOeuvre.dimensions}
            onChange={(e) => handleInputChange(e, newOeuvre)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <input
            type="number"
            step="0.01"
            name="prixVente"
            placeholder="Prix de vente"
            value={newOeuvre.prixVente}
            onChange={(e) => handleInputChange(e, newOeuvre)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <input
            type="number"
            step="0.01"
            name="reduction"
            placeholder="Réduction"
            value={newOeuvre.reduction}
            onChange={(e) => handleInputChange(e, newOeuvre)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          />

          <select
            name="availability"
            value={newOeuvre.availability}
            onChange={(e) => handleInputChange(e, newOeuvre)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Disponibilité</option>
            {availabilityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {(newOeuvre.availability === 'sold') && (
            <input
              type="date"
              name="dateVente"
              value={newOeuvre.dateVente || ''}
              onChange={(e) => handleInputChange(e, newOeuvre)}
              style={{
                padding: '10px',
                borderRadius: '4px',
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.input,
                color: theme.colors.text
              }}
              required
            />
          )}

          <select
            name="propertyStatus"
            value={newOeuvre.propertyStatus}
            onChange={(e) => handleInputChange(e, newOeuvre)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Statut de propriété</option>
            {propertyStatusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="consignmentDuration"
            value={newOeuvre.consignmentDuration}
            onChange={(e) => handleInputChange(e, newOeuvre)}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Durée de consignation</option>
            {consignmentDurationOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
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
              transition: 'opacity 0.2s'
            }}
          >
            Ajouter
          </button>
        </form>
      </div>

      <div style={{ width: '100%' }}>
        <DataTable
          data={oeuvres}
          columns={columns}
          onEdit={handleEdit}
          onDelete={(oeuvre) => {
            // Only prevent deletion if work was already sold
            if (oeuvre.availability === 'sold' && oeuvre.dateVente) {
              setError('Les œuvres vendues ne peuvent pas être supprimées');
              return;
            }
            handleDelete(oeuvre);
          }}
          searchPlaceholder="Rechercher une oeuvre..."
          initialSortColumn="titre"
          onRefresh={fetchData}
          rowStyle={(row) => ({
            opacity: row.availability === 'sold' ? 0.7 : 1,
            backgroundColor: row.availability === 'sold' ? 'rgba(0,0,0,0.05)' : 'inherit',
            cursor: row.availability === 'sold' ? 'not-allowed' : 'pointer'
          })}
        />
      </div>
    </div>
  );
};

export default OeuvresComponent;
