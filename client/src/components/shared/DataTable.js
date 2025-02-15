import React, { useState, useRef, useEffect } from 'react';

const DataTable = ({ 
  data, 
  columns, 
  onEdit, 
  onDelete, 
  searchPlaceholder = "Rechercher...",
  initialSortColumn = null,
  onRefresh = () => {} // New prop for refresh action
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(initialSortColumn);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({});
  const [filterMenuOpen, setFilterMenuOpen] = useState(null);
  const [uniqueValues, setUniqueValues] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const filterMenuRef = useRef(null);

  useEffect(() => {
    const newUniqueValues = {};
    columns.forEach(column => {
      const values = new Set(data.map(item => item[column.key]));
      newUniqueValues[column.key] = Array.from(values)
        .filter(value => value !== null && value !== undefined)
        .sort();
    });
    setUniqueValues(newUniqueValues);
  }, [data, columns]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setFilterMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleFilter = (columnKey, selectedValues) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: selectedValues
    }));
  };

  const handleDelete = async (item) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      try {
        await onDelete(item);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const startEditing = (item) => {
    setEditingRow(item._id);
    setEditedValues({ ...item });
  };

  const handleInputChange = (columnKey, value) => {
    setEditedValues(prev => ({
      ...prev,
      [columnKey]: value
    }));
  };

  const handleSave = async () => {
    try {
      await onEdit(editedValues);
      setEditingRow(null);
      setEditedValues({});
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditedValues({});
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }
  };

  const FilterMenu = ({ column }) => {
    const [filterSearch, setFilterSearch] = useState('');
    const filteredValues = uniqueValues[column.key]?.filter(value => 
      String(value).toLowerCase().includes(filterSearch.toLowerCase())
    );

    // Count occurrences of each value
    const valueCounts = {};
    data.forEach(item => {
      const value = item[column.key];
      if (value !== null && value !== undefined) {
        valueCounts[value] = (valueCounts[value] || 0) + 1;
      }
    });

    return (
      <div 
        ref={filterMenuRef}
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto',
          minWidth: '250px'
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <input
            type="text"
            placeholder="Rechercher..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '4px',
              marginBottom: '4px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px' 
        }}>
          <label style={{ 
            display: 'flex', 
            color: '#666',
            alignItems: 'center',
            padding: '4px',
            borderBottom: '1px solid #eee'
          }}>
            <input
              type="checkbox"
              checked={!filters[column.key] || filters[column.key].length === 0}
              onChange={(e) => {
                if (e.target.checked) {
                  handleFilter(column.key, []);
                }
              }}
              style={{ marginRight: '8px' }}
            />
            <span style={{ flex: 1 }}>Tout sélectionner</span>
            <span style={{ 
              color: '#666',
              fontSize: '0.9em',
              marginLeft: '8px' 
            }}>
              ({data.length})
            </span>
          </label>
          {filteredValues?.map((value, index) => (
            <label 
              key={index} 
              style={{ 
                display: 'flex', 
                color: '#666',
                alignItems: 'center',
                padding: '4px',
                cursor: 'pointer',
                userSelect: 'none',
                backgroundColor: filters[column.key]?.includes(value) ? '#f0f9ff' : 'transparent',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              <input
                type="checkbox"
                checked={!filters[column.key] || filters[column.key].includes(value)}
                onChange={(e) => {
                  const currentFilters = filters[column.key] || [];
                  if (e.target.checked) {
                    handleFilter(column.key, [...currentFilters, value]);
                  } else {
                    handleFilter(column.key, currentFilters.filter(v => v !== value));
                  }
                }}
                style={{ marginRight: '8px' }}
              />
              <span style={{ flex: 1 }}>
                {value || '(Vide)'}
              </span>
              <span style={{ 
                color: '#666',
                fontSize: '0.9em',
                marginLeft: '8px' 
              }}>
                ({valueCounts[value] || 0})
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const filteredData = data.filter(item => {
    const matchesSearch = Object.values(item)
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesFilters = Object.entries(filters).every(([key, selectedValues]) => {
      if (!selectedValues || selectedValues.length === 0) return true;
      return selectedValues.includes(item[key]);
    });

    return matchesSearch && matchesFilters;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' 
      ? aValue - bValue 
      : bValue - aValue;
  });

  const renderCell = (item, column) => {
    if (editingRow === item._id) {
      const commonInputStyles = {
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        fontSize: '14px',
        transition: 'all 0.3s ease',
        margin: 0,
        display: 'block',
        '&:focus': {
          borderColor: '#3498db',
          boxShadow: '0 0 0 2px rgba(52,152,219,0.2)',
          outline: 'none'
        }
      };

      if (column.type === 'select' && column.options) {
        const currentValue = column.getValue ? column.getValue(editedValues[column.key]) : editedValues[column.key];
        return (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <select
              value={currentValue || ''}
              onChange={(e) => {
                handleInputChange(column.key, e.target.value);
                if (column.onChange) {
                  column.onChange(e.target.value, item);
                }
              }}
              style={commonInputStyles}
            >
              <option value="">Sélectionner</option>
              {column.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (column.type === 'date') {
        const dateValue = column.getValue ? column.getValue(editedValues[column.key]) : editedValues[column.key];
        return (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <input
              type="date"
              value={dateValue || ''}
              onChange={(e) => handleInputChange(column.key, e.target.value)}
              style={commonInputStyles}
            />
          </div>
        );
      }

      if (column.key === 'status' || column.key === 'statut' || column.key === 'type' || column.key === 'modePaiement') {
        return (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <select
              value={editedValues[column.key] || ''}
              onChange={(e) => handleInputChange(column.key, e.target.value)}
              style={commonInputStyles}
            >
              {uniqueValues[column.key]?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      }

      const inputType = 
        column.key.toLowerCase().includes('date') ? 'date' :
        column.key.toLowerCase().includes('prix') || 
        column.key.toLowerCase().includes('montant') ? 'number' : 'text';

      return (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', height: '100%' }}>
          <input
            type={inputType}
            value={editedValues[column.key] || ''}
            onChange={(e) => handleInputChange(column.key, e.target.value)}
            style={commonInputStyles}
          />
        </div>
      );
    }
    return (
      <div style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center'
      }}>
        {column.render ? column.render(item[column.key], item) : item[column.key]}
      </div>
    );
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '20px',
        gap: '10px'
      }}>
        <div style={{ 
          position: 'relative',
          flex: 1
        }}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '90%',
              padding: '12px',
              paddingLeft: '40px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          />
          <i 
            className="fas fa-search" 
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666'
            }}
          />
        </div>
        <button
          onClick={handleRefresh}
          style={{
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: '#f8f9fa'
            }
          }}
        >
          <i className="fas fa-sync-alt"></i>
          <span>Actualiser</span>
        </button>
      </div>

        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              {columns.map(column => (
                <th 
                  key={column.key}
                  style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #ddd',
                    position: 'relative',
                    fontWeight: '600',
                    color: 'theme.colors.text'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}>
                    <span onClick={() => handleSort(column.key)}>
                      {column.label}
                      {sortColumn === column.key && (
                        <span style={{ 
                          marginLeft: '8px',
                          color: '#3498db'
                        }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                    <i 
                      className="fas fa-filter"
                      onClick={() => setFilterMenuOpen(filterMenuOpen === column.key ? null : column.key)}
                      style={{ 
                        marginLeft: '8px',
                        color: filters[column.key]?.length ? '#3498db' : '#999',
                        transition: 'color 0.3s ease'
                      }}
                    />
                  </div>
                  {filterMenuOpen === column.key && <FilterMenu column={column} />}
                </th>
              ))}
              <th style={{ 
                padding: '16px', 
                textAlign: 'center', 
                borderBottom: '2px solid #ddd',
                fontWeight: '600',
                color: 'white'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr 
                key={item._id} 
                style={{ 
                  borderBottom: '1px solid #ddd',
                  '&:hover': {
                    backgroundColor: '#f8f9fa'
                  }
                }}
              >
                {columns.map(column => (
                  <td 
                    key={column.key} 
                    style={{ 
                      padding: '12px 16px',
                      transition: 'background-color 0.3s ease'
                    }}
                  >
                    {renderCell(item, column)}
                  </td>
                ))}
                <td style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center'
                }}>
                  {editingRow === item._id ? (
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px',
                      justifyContent: 'center' 
                    }}>
                      <button
                        onClick={handleSave}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease',
                          '&:hover': {
                            backgroundColor: '#45a049'
                          }
                        }}
                      >
                        <i className="fas fa-save"></i>
                      </button>
                      <button
                        onClick={handleCancel}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease',
                          '&:hover': {
                            backgroundColor: '#da190b'
                          }
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px',
                      justifyContent: 'center' 
                    }}>
                      <button
                        onClick={() => startEditing(item)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease',
                          '&:hover': {
                            backgroundColor: '#2980b9'
                          }
                        }}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease',
                          '&:hover': {
                            backgroundColor: '#da190b'
                          }
                        }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );
};

const EditableCell = ({ value, isEditing, onChange, type = 'text', options = [] }) => {
  if (!isEditing) {
    return <div className="px-4 py-2">{value}</div>;
  }

  switch (type) {
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Sélectionner...</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded"
        />
      );
    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded"
        />
      );
  }
};

export default DataTable;
