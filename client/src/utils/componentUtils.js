export const handleComponentRefresh = async (fetchFunction, setError) => {
  setError(''); // Clear error on refresh
  try {
    await fetchFunction();
  } catch (error) {
    setError('Erreur lors du rafraîchissement: ' + error.message);
  }
};

export const handleComponentError = (error, setError) => {
  setError('Erreur: ' + error.message);
  console.error('Error:', error);
}; 