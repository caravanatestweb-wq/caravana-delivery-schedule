// TextMagic API helpers - credentials stored in localStorage
export const getTMCredentials = () => ({
  username: localStorage.getItem('tm_username') || '',
  apiKey:   localStorage.getItem('tm_apikey') || '',
});

/**
 * Sends an SMS via our secure Vercel API Bridge
 * @param {string} phone - Target phone number
 * @param {string} message - Message text
 * @returns {Promise<Object>} - API response
 */
export const sendTextMagicSMS = async (phone, message) => {
  // Clean phone number to digits only, ensure +1 prefix for US numbers
  const cleanPhone = phone.replace(/\D/g, '');
  const e164 = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
  try {
    const creds = getTMCredentials();
    const resp = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: message, 
        phones: e164,
        username: creds.username,
        apiKey: creds.apiKey
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.message || data.error || `Error ${resp.status}`);
    }
    return data;
  } catch (err) {
    console.error('SMS sending error:', err);
    throw err;
  }
};
