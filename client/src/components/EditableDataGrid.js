import React, { useState, useRef, useEffect } from 'react';

const EditableCell = ({ value, isEditing, onChange, type = 'text', options = [] }) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (!isEditing) {
    return <div className="px-4 py-2">{value}</div>;
  }

  switch (type) {
    case 'select':
      return (
        <select
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-1 border rounded"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'number':
      return (
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-1 border rounded"
        />
      );
    case 'date':
      return (
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-1 border rounded"
        />
      );
    default:
      return (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-1 border rounded"
        />
      );
  }
};

const EditableDataGrid = ({
  data,
  columns,
  onUpdate,
  onDelete,
  searchPlaceholder = "Rechercher...",
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [editedData, setEditedData] = useState(data);

  useEffect(() => {
    setEditedData(data);
  }, [data]);

  const handleCellClick = (rowIndex, columnKey) => {
    setEditingCell({ rowIndex, columnKey });
  };

  const handleCellChange = (rowIndex, columnKey, value) => {
    const newData = [...editedData];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [columnKey]: value,
    };
    setEditedData(newData);
  };

  const handleCellBlur = async (rowIndex) => {
    if (editingCell && editingCell.rowIndex === rowIndex) {
      const updatedRow = editedData[rowIndex];
      await onUpdate(updatedRow);
      setEditingCell(null);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = [...editedData]
    .filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="w-full">
      <div className="mb-4">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className="p-2 text-left border cursor-pointer hover:bg-gray-200"
                >
                  {column.label}
                  {sortConfig.key === column.key && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.map((row, rowIndex) => (
              <tr key={row._id || rowIndex} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    onClick={() => handleCellClick(rowIndex, column.key)}
                    onBlur={() => handleCellBlur(rowIndex)}
                    className="border"
                  >
                    <EditableCell
                      value={row[column.key]}
                      isEditing={
                        editingCell?.rowIndex === rowIndex &&
                        editingCell?.columnKey === column.key
                      }
                      onChange={(value) =>
                        handleCellChange(rowIndex, column.key, value)
                      }
                      type={column.type}
                      options={column.options}
                    />
                  </td>
                ))}
                <td className="border p-2">
                  <button
                    onClick={() => onDelete(row)}
                    className="px-3 py-1 text-white bg-red-500 rounded hover:bg-red-600"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableDataGrid;