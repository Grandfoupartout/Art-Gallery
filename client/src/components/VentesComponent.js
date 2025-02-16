import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from './shared/DataTable';
import { useTheme } from '../context/ThemeContext';
import { handleComponentRefresh, handleComponentError } from '../utils/componentUtils';

const VentesComponent = () => {
  const [ventes, setVentes] = useState([]);
  const [oeuvres, setOeuvres] = useState([]);
  const [clients, setClients] = useState([]);
  const [newVente, setNewVente] = useState({
    idOeuvre: '',
    idClient: '',
    dateVente: '',
    prixVente: '',
    commission: '',
    modePaiement: '',
    commentaires: ''
  });
  const [error, setError] = useState('');
  const [editingVente, setEditingVente] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  const { theme } = useTheme();

  useEffect(() => {
    fetchVentes();
    fetchOeuvres();
    fetchClients();
  }, []);

  const fetchVentes = async () => {
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/ventes');
      setVentes(response.data);
    } catch (error) {
      handleComponentError(error, setError);
    }
  };

  const fetchOeuvres = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/oeuvres');
      setOeuvres(response.data);
    } catch (error) {
      setError('Erreur lors du chargement des œuvres: ' + error.message);
      console.error('Error fetching oeuvres:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/clients');
      setClients(response.data);
    } catch (error) {
      setError('Erreur lors du chargement des clients: ' + error.message);
      console.error('Error fetching clients:', error);
    }
  };

  const handleInputChange = (e, vente) => {
    const { name, value } = e.target;
    
    // Special handling for date fields
    if (name === 'dateVente') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        setError('Date invalide');
        return;
      }
      setVentes(prevVentes =>
        prevVentes.map(v =>
          v._id === vente._id ? { ...v, [name]: date.toISOString() } : v
        )
      );
      return;
    }

    // Handle other fields normally
    setVentes(prevVentes =>
      prevVentes.map(v =>
        v._id === vente._id ? { ...v, [name]: value } : v
      )
    );
  };

  const handleEdit = async (vente) => {
    try {
      const updatedVente = { ...vente };

      // Format the date properly for the server
      if (updatedVente.dateVente) {
        const date = new Date(updatedVente.dateVente);
        if (!isNaN(date.getTime())) {
          updatedVente.dateVente = date.toISOString();
        } else {
          setError('Date invalide');
          return;
        }
      }

      // Always get the latest price from the oeuvre
      const selectedOeuvre = oeuvres.find(o => o._id === vente.idOeuvre);
      if (selectedOeuvre) {
        const price = selectedOeuvre.prixVente;
        const reduction = selectedOeuvre.reduction || 0;
        updatedVente.prixVente = price * (1 - reduction / 100);
      }

      const response = await axios.put(
        `http://localhost:5000/api/ventes/${vente._id}`,
        updatedVente
      );
      
      setVentes(prevVentes =>
        prevVentes.map(v => v._id === vente._id ? response.data : v)
      );
      setEditingVente(null);
      setEditingRow(null);
      setEditedValues({});
    } catch (error) {
      setError('Erreur lors de la modification: ' + error.message);
    }
  };

  const handleDelete = async (vente) => {
    try {
      // 1. Delete the sale
      await axios.delete(`http://localhost:5000/api/ventes/${vente._id}`);
      
      // 2. Find and delete related budget entries
      const budgetResponse = await axios.get('http://localhost:5000/api/budget');
      const relatedEntries = budgetResponse.data.filter(entry => 
        entry.description.includes(oeuvres.find(o => o._id === vente.idOeuvre)?.titre)
      );

      // Delete each related budget entry
      await Promise.all(
        relatedEntries.map(entry => 
          axios.delete(`http://localhost:5000/api/budget/${entry._id}`)
        )
      );

      // Update local state
      setVentes(prevVentes =>
        prevVentes.filter(v => v._id !== vente._id)
      );
    } catch (error) {
      setError('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!newVente.idOeuvre || !newVente.idClient || !newVente.dateVente) {
      setError('L\'œuvre, le client et la date sont obligatoires');
      return;
    }

    try {
      const venteToSubmit = { ...newVente };
      
      // Ensure proper date formatting
      if (venteToSubmit.dateVente) {
        // Convert local date to ISO string
        const date = new Date(venteToSubmit.dateVente);
        if (!isNaN(date.getTime())) {
          venteToSubmit.dateVente = date.toISOString();
        } else {
          setError('Date invalide');
          return;
        }
      }

      // Calculate final price with selected oeuvre
      const selectedOeuvre = oeuvres.find(o => o._id === venteToSubmit.idOeuvre);
      let finalPrice = 0;
      if (selectedOeuvre) {
        const price = selectedOeuvre.prixVente;
        const reduction = selectedOeuvre.reduction || 0;
        finalPrice = price * (1 - reduction / 100);
        venteToSubmit.prixVente = finalPrice;
      }

      // 1. Create the sale
      const venteResponse = await axios.post('http://localhost:5000/api/ventes', venteToSubmit);
      
      // 2. Update the oeuvre status
      const updatedOeuvre = {
        ...selectedOeuvre,
        statut: 'vendu',
        propertyStatus: 'other',
        availability: 'sold',
        dateVente: venteToSubmit.dateVente,
        editable: false
      };

      await axios.put(`http://localhost:5000/api/oeuvres/${selectedOeuvre._id}`, updatedOeuvre);
      
      // 3. Create budget entry
      const budgetEntry = {
        date: venteToSubmit.dateVente,
        categorie: 'ventes',
        description: `Vente: ${selectedOeuvre.titre} à ${clients.find(c => c._id === venteToSubmit.idClient)?.nom}`,
        montant: finalPrice,
        type: 'revenu'
      };

      await axios.post('http://localhost:5000/api/budget', budgetEntry);

      // 4. Handle commission if exists
      if (selectedOeuvre.commission) {
        const commissionAmount = (finalPrice * selectedOeuvre.commission) / 100;
        const commissionEntry = {
          date: venteToSubmit.dateVente,
          categorie: 'commissions',
          description: `Commission pour ${selectedOeuvre.titre} (${selectedOeuvre.commission}%)`,
          montant: commissionAmount,
          type: 'depense'
        };

        await axios.post('http://localhost:5000/api/budget', commissionEntry);
      }

      // Update local states
      setVentes([...ventes, venteResponse.data]);
      setOeuvres(prevOeuvres => 
        prevOeuvres.map(o => 
          o._id === selectedOeuvre._id ? updatedOeuvre : o
        )
      );

      // Reset form
      setNewVente({
        idOeuvre: '',
        idClient: '',
        dateVente: '',
        prixVente: '',
        modePaiement: '',
        commentaires: ''
      });
      setError('');

    } catch (error) {
      setError('Erreur lors de l\'ajout de la vente: ' + error.message);
    }
  };

  const refreshData = () => {
    handleComponentRefresh(async () => {
      await Promise.all([
        fetchVentes(),
        fetchOeuvres(),
        fetchClients()
      ]);
    }, setError);
  };

  // Payment method options
  const paymentMethodOptions = [
    { value: 'Carte', label: '💳 Carte bancaire' },
    { value: 'Virement', label: '🏦 Virement' },
    { value: 'Chèque', label: '📝 Chèque' },
    { value: 'Espèces', label: '💶 Espèces' }
  ];

  // Handle oeuvre selection and auto-fill price
  const handleOeuvreSelect = (e) => {
    const selectedOeuvre = oeuvres.find(o => o._id === e.target.value);
    if (selectedOeuvre) {
      const price = selectedOeuvre.prixVente;
      const reduction = selectedOeuvre.reduction || 0;
      const finalPrice = price * (1 - reduction / 100); // Apply reduction if exists
      
      setNewVente({
        ...newVente,
        idOeuvre: selectedOeuvre._id,
        prixVente: finalPrice
      });
    } else {
      setNewVente({
        ...newVente,
        idOeuvre: '',
        prixVente: ''
      });
    }
  };

  const columns = [
    {
      key: 'dateVente',
      label: 'Date de vente',
      type: 'date',
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
            return date.toLocaleDateString('fr-FR');
          } catch (error) {
            return 'Date invalide';
          }
        }

        // For edit mode
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
    },
    { 
      key: 'idOeuvre', 
      label: 'Œuvre',
      type: 'select',
      options: oeuvres
        .filter(o => o.availability !== 'sold' || o._id === editingVente?.idOeuvre)
        .map(oeuvre => ({
          value: oeuvre._id,
          label: `${oeuvre.titre} (${oeuvre.prixVente}€)`
        })),
      render: (value, item) => {
        const oeuvre = oeuvres.find(o => o._id === (value?._id || value));
        return oeuvre ? `${oeuvre.titre} (${oeuvre.prixVente}€)` : '';
      },
      getValue: (value) => value?._id || value,
      onChange: async (value, item) => {
        const selectedOeuvre = oeuvres.find(o => o._id === value);
        if (selectedOeuvre) {
          const price = selectedOeuvre.prixVente;
          const reduction = selectedOeuvre.reduction || 0;
          const finalPrice = price * (1 - reduction / 100);
          
          const updatedItem = {
            ...item,
            idOeuvre: value,
            prixVente: finalPrice
          };
          await handleEdit(updatedItem);
        }
      }
    },
    { 
      key: 'idClient', 
      label: 'Client',
      type: 'select',
      options: clients.map(client => ({
        value: client._id,
        label: client.nom
      })),
      render: (value) => value?.nom || '',
      getValue: (value) => value?._id || value
    },
    { 
      key: 'prixVente', 
      label: 'Prix',
      render: (value, item) => {
        const oeuvre = oeuvres.find(o => o._id === item.idOeuvre?._id);
        if (oeuvre) {
          const reduction = oeuvre.reduction || 0;
          const finalPrice = oeuvre.prixVente * (1 - reduction / 100);
          return `${finalPrice}€`;
        }
        return value ? `${value}€` : '';
      },
      readOnly: true // Make price field read-only
    },
    { 
      key: 'modePaiement', 
      label: 'Mode de Paiement',
      type: 'select',
      options: paymentMethodOptions,
      render: (value) => paymentMethodOptions.find(opt => opt.value === value)?.label || value
    },
    { key: 'commentaires', label: 'Commentaires' }
  ];

  const startEditing = (item) => {
    setEditingRow(item._id);
    setEditingVente(item);
    setEditedValues({
      ...item,
      dateVente: item.dateVente ? new Date(item.dateVente).toISOString().split('T')[0] : '',
      idOeuvre: item.idOeuvre?._id || item.idOeuvre,
      idClient: item.idClient?._id || item.idClient
    });
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
        alignItems: 'center'
      }}>
        <h2 style={{ 
          color: theme.colors.text, 
          margin: 0, 
          padding: '10px'
        }}>
          Gestion des Ventes
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
          <select
            name="idOeuvre"
            value={newVente.idOeuvre}
            onChange={handleOeuvreSelect}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Sélectionner une œuvre *</option>
            {oeuvres
              .filter(o => o.availability !== 'sold')
              .map(oeuvre => (
                <option key={oeuvre._id} value={oeuvre._id}>
                  {oeuvre.titre} ({oeuvre.prixVente}€)
                </option>
            ))}
          </select>

          <select
            name="idClient"
            value={newVente.idClient}
            onChange={(e) => setNewVente({ ...newVente, idClient: e.target.value })}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Sélectionner un client *</option>
            {clients.map(client => (
              <option key={client._id} value={client._id}>
                {client.nom}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="dateVente"
            value={newVente.dateVente ? new Date(newVente.dateVente).toISOString().split('T')[0] : ''}
            onChange={(e) => setNewVente({ 
              ...newVente, 
              dateVente: e.target.value 
            })}
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
            name="prixVente"
            placeholder="Prix de vente"
            value={newVente.prixVente}
            readOnly
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: `${theme.colors.input}80`,
              color: theme.colors.text,
              cursor: 'not-allowed'
            }}
          />

          <select
            name="modePaiement"
            value={newVente.modePaiement}
            onChange={(e) => setNewVente({ ...newVente, modePaiement: e.target.value })}
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.input,
              color: theme.colors.text
            }}
          >
            <option value="">Mode de paiement</option>
            {paymentMethodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <textarea
            name="commentaires"
            placeholder="Commentaires"
            value={newVente.commentaires}
            onChange={(e) => setNewVente({ ...newVente, commentaires: e.target.value })}
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
            {editingVente ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </form>
      </div>

      <DataTable
        data={ventes}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Rechercher une vente..."
        initialSortColumn="dateVente"
        onRefresh={refreshData}
      />
    </div>
  );
};

export default VentesComponent;