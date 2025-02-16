// Formatting helper functions
const formatDirectList = (records) => {
  let content = '';
  records.forEach((record, index) => {
    content += `${index + 1}. `;
    Object.entries(record).forEach(([key, value]) => {
      content += `${key}: ${value}, `;
    });
    content = content.slice(0, -2) + '\n';
  });
  return content;
};

const formatTableView = (records) => {
  if (!records || records.length === 0) return 'No data available';

  const headers = Object.keys(records[0]);
  let table = '| ' + headers.join(' | ') + ' |\n';
  table += '|' + headers.map(() => '---').join('|') + '|\n';

  records.forEach(record => {
    table += '| ' + headers.map(header => record[header] || '-').join(' | ') + ' |\n';
  });

  return table;
};

const formatSummaryView = (records) => {
  const total = records.length;
  const preview = records.slice(0, 5);
  
  let content = `Total Records: ${total}\n\nPreview (first 5):\n`;
  content += formatTableView(preview);
  content += `\n... and ${total - 5} more records\n`;
  
  return content;
};

const formatTextualData = (records, format) => {
  if (format === 'list') {
    return formatDirectList(records);
  } else if (format === 'table') {
    return formatTableView(records);
  }
  return formatDefaultView(records);
};

const formatTemporalData = (records) => {
  let timeline = '📅 Timeline\n\n';
  records.sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      timeline += `${date}\n`;
      timeline += `└─ ${record.event || record.description}\n`;
      if (record.details) {
        timeline += `   ${record.details}\n`;
      }
      timeline += '\n';
    });
  return timeline;
};

const formatDefaultView = (records) => {
  return JSON.stringify(records, null, 2);
};

const formatNoDataResponse = (collections) => `
No data found in the following collections:
${collections.join('\n')}

Would you like to:
1. Try a different query
2. View available fields in these collections
3. Get help with query syntax
`;

const formatNumericalData = (records, count) => {
  if (count <= 5) {
    return formatDirectList(records);
  } else if (count <= 20) {
    return formatTableView(records);
  }
  return formatSummaryView(records);
};

// Main formatting function
export const formatResponse = (data, userPreferences) => {
  const metadata = {
    collections: data.collections,
    recordCount: data.records?.length || 0,
    lastUpdated: data.lastUpdated,
    queryType: data.type,
    format: determineFormat(data.type, data.records?.length, userPreferences)
  };

  let content = `📊 Database Query Results\n\n`;
  content += `Sources: ${data.collections.join(', ')}\n`;
  content += `Found ${data.records?.length || 0} records\n\n`;

  // Format based on data type and preferences
  content += formatDataByType(data.records, metadata.format);

  // Add refinement options
  content += `\n\nWould you like to:\n`;
  content += `1. Change the presentation format\n`;
  content += `2. Adjust the level of detail\n`;
  content += `3. Get additional context\n`;

  return { content, metadata };
};

const determineFormat = (type, recordCount, preferences) => {
  if (preferences?.formatPreferences?.[type]) {
    return preferences.formatPreferences[type];
  }

  // Default format selection based on data type and size
  switch (type) {
    case 'numerical':
      return recordCount > 10 ? 'chart' : 'table';
    case 'temporal':
      return 'timeline';
    case 'categorical':
      return recordCount > 5 ? 'table' : 'list';
    default:
      return 'list';
  }
};

const formatDataByType = (records, format) => {
  switch (format) {
    case 'table':
      return formatTableView(records);
    case 'list':
      return formatListView(records);
    case 'chart':
      return formatChartData(records);
    case 'timeline':
      return formatTimelineView(records);
    default:
      return formatDefaultView(records);
  }
};

export const formatFeedbackPrompt = () => `
\nTo help improve responses:
1. Was this format helpful for viewing the data?
2. Would you prefer a different level of detail?
3. What additional context would make this more useful?
`;

export const formatErrorMessage = (error) => `
❌ Error: ${error.message}

Available collections are:
${error.collections?.join('\n') || 'No collections available'}

Would you like to:
1. Modify your search terms
2. View available fields in these collections
3. Get a summary of accessible data
`;

// Add these with your other formatting functions

const formatListView = (records) => {
  if (!records || records.length === 0) return 'No data available';
  
  let content = '';
  records.forEach((record, index) => {
    content += `${index + 1}. `;
    Object.entries(record).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        content += `${key}: ${value}, `;
      }
    });
    content = content.slice(0, -2) + '\n';
  });
  return content;
};

const formatChartData = (records) => {
  if (!records || records.length === 0) return 'No data available';
  
  // Convert to ASCII chart for text-based display
  const headers = Object.keys(records[0]);
  let chart = '📊 Chart View\n\n';
  
  // For numerical data, create a simple bar chart
  if (typeof records[0][headers[1]] === 'number') {
    const maxValue = Math.max(...records.map(r => r[headers[1]]));
    const scale = 20; // max bar length
    
    records.forEach(record => {
      const barLength = Math.round((record[headers[1]] / maxValue) * scale);
      chart += `${record[headers[0]].padEnd(15)} ${'█'.repeat(barLength)} ${record[headers[1]]}\n`;
    });
  }
  
  return chart;
};

const formatTimelineView = (records) => {
  if (!records || records.length === 0) return 'No data available';
  
  let timeline = '📅 Timeline View\n\n';
  
  // Sort records by date if available
  const sortedRecords = [...records].sort((a, b) => {
    const dateA = new Date(a.date || a.dateCreation || a.timestamp);
    const dateB = new Date(b.date || b.dateCreation || b.timestamp);
    return dateA - dateB;
  });
  
  sortedRecords.forEach(record => {
    const date = new Date(record.date || record.dateCreation || record.timestamp);
    timeline += `${date.toLocaleDateString()}\n`;
    timeline += `└─ ${formatTimelineEntry(record)}\n`;
  });
  
  return timeline;
};

const formatTimelineEntry = (record) => {
  // Remove date-related and internal fields
  const { date, dateCreation, timestamp, _id, __v, ...rest } = record;
  return Object.entries(rest)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
};

// Add these to your exports
export {
  formatDirectList,
  formatTableView,
  formatSummaryView,
  formatTextualData,
  formatTemporalData,
  formatDefaultView,
  formatNoDataResponse,
  formatNumericalData,
  formatListView,
  formatChartData,
  formatTimelineView
}; 