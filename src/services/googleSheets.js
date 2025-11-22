export const sendToGoogleSheet = async (scriptUrl, data) => {
  if (!scriptUrl) return;
  
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return true;
  } catch (error) {
    console.error('Error sending to Google Sheets:', error);
    return false;
  }
};
