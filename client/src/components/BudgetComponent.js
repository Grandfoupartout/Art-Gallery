import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from './shared/DataTable';
import { useTheme } from '../context/ThemeContext';
import { handleComponentRefresh, handleComponentError } from '../utils/componentUtils';

const BudgetComponent = () => {
  const [budget, setBudget] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [newEntry, setNewEntry] = useState({
    date: '',
    categorie: '',
    description: '',
    montant: '',
    type: 'depense' // New field to track income/expense
  });
  const [error, setError] = useState('');
  const { theme } = useTheme();

  const categories = [
    'Matériel',
    'Marketing',
    'Location',
    'Salaires',
    'Événements',
    'Ventes',
    'Commissions',
    'Autres'
  ];

  // Add these constants for dropdown options
  const categoryOptions = [
    { value: 'materiel', label: 'Matériel' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'location', label: 'Location' },
    { value: 'salaires', label: 'Salaires' },
    { value: 'evenements', label: 'Événements' },
    { value: 'ventes', label: 'Ventes' },
    { value: 'commissions', label: 'Commissions' },
    { value: 'autres', label: 'Autres' }
  ];

  const typeOptions = [
    { value: 'depense', label: 'Dépense' },
    { value: 'revenu', label: 'Revenu' }
  ];

  useEffect(() => {
    fetchBudget();
  }, []);

  const refreshData = () => {
    handleComponentRefresh(fetchBudget, setError);
  };

  const fetchBudget = async () => {
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/budget');
      setBudget(response.data);
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingEntry) {
      setEditingEntry({ ...editingEntry, [name]: value });
    } else {
      setNewEntry({ ...newEntry, [name]: value });
    }
    setError('');
  };

  const handleEdit = async (entry) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/budget/${entry._id}`,
        entry
      );
      setBudget(prevBudget =>
        prevBudget.map(b => b._id === entry._id ? response.data : b)
      );
      setEditingEntry(null);
    } catch (error) {
      setError('Erreur lors de la modification: ' + error.message);
    }
  };

  const handleDelete = async (entry) => {
    try {
      await axios.delete(`http://localhost:5000/api/budget/${entry._id}`);
      setBudget(prevBudget =>
        prevBudget.filter(b => b._id !== entry._id)
      );
    } catch (error) {
      setError('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!newEntry.date || !newEntry.montant || !newEntry.categorie) {
      setError('La date, le montant et la catégorie sont obligatoires');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/budget', newEntry);
      setBudget([...budget, response.data]);
      setNewEntry({
        date: '',
        categorie: '',
        description: '',
        montant: '',
        type: 'depense'
      });
      setError('');
    } catch (error) {
      setError('Erreur lors de l\'ajout de l\'entrée: ' + error.message);
    }
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : ''
    },
    { 
      key: 'categorie', 
      label: 'Catégorie',
      type: 'select',
      options: categoryOptions,
      render: (value) => categoryOptions.find(opt => opt.value === value)?.label || value
    },
    { key: 'description', label: 'Description' },
    {
      key: 'montant',
      label: 'Montant',
      render: (value, row) => {
        const amount = parseFloat(value);
        const color = row.type === 'revenu' ? '#4CAF50' : '#f44336';
        return (
          <span style={{ color }}>
            {row.type === 'revenu' ? '+' : '-'}{Math.abs(amount).toLocaleString('fr-FR')}€
          </span>
        );
      }
    },
    { 
      key: 'type', 
      label: 'Type',
      type: 'select',
      options: typeOptions,
      render: (value) => typeOptions.find(opt => opt.value === value)?.label || value
    }
  ];

  const calculateTotal = () => {
    return budget.reduce((acc, entry) => {
      const amount = parseFloat(entry.montant);
      return entry.type === 'revenu' ? acc + amount : acc - amount;
    }, 0);
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
          Gestion du Budget
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
            type="date"
            name="date"
            value={newEntry.date}
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
            name="categorie"
            value={newEntry.categorie}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              padding: '0.60rem',
              fontSize: '1rem',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
            required
          >
            <option value="">Sélectionner une catégorie *</option>
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            name="montant"
            placeholder="Montant *"
            value={newEntry.montant}
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
            value={newEntry.type}
            onChange={handleInputChange}
            style={{
              padding: '10px',
              borderRadius: '4px',
              padding: '0.60rem',
              fontSize: '1rem',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="depense">Dépense</option>
            <option value="revenu">Revenu</option>
          </select>

          <input
            type="text"
            name="description"
            placeholder="Description"
            value={newEntry.description}
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
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 0.9
              }
            }}
          >
            {editingEntry ? 'Mettre à jour' : 'Ajouter'}
          </button>

          {editingEntry && (
            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setNewEntry({
                  date: '',
                  categorie: '',
                  description: '',
                  montant: '',
                  type: 'depense'
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

      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
         boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <span style={{ fontSize: '1.1rem' }}>Total: </span>
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '1.2rem',
          color: calculateTotal() >= 0 ? '#4CAF50' : '#f44336' 
        }}>
          {calculateTotal().toLocaleString('fr-FR')}€
        </span>
      </div>

      <div style={{ width: '100%' }}>
        <DataTable
          data={budget}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="Rechercher une entrée..."
          initialSortColumn="date"
          onRefresh={refreshData}
        />
      </div>
    </div>
  );
};

export default BudgetComponent;