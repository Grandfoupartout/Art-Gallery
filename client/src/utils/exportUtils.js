export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV format
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        let cellData = row[header];
        
        // Handle special cases
        if (cellData instanceof Date) {
          cellData = cellData.toLocaleDateString('fr-FR');
        } else if (typeof cellData === 'object' && cellData !== null) {
          cellData = cellData.nom || cellData.titre || JSON.stringify(cellData);
        }
        
        // Escape commas and quotes
        cellData = cellData?.toString().replace(/"/g, '""') || '';
        if (cellData.includes(',') || cellData.includes('"') || cellData.includes('\n')) {
          cellData = `"${cellData}"`;
        }
        
        return cellData;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 