// TextMagic API helpers - credentials stored in localStorage
export const getTMCredentials = () => ({
  username: localStorage.getItem('tm_username') || '',
  apiKey:   localStorage.getItem('tm_apikey') || '',
});

/**
 * Sends an SMS via our secure Reverse Proxy Bridge
 * @param {string} phone - Target phone number
 * @param {string} message - Message text
 * @param {string} [deliveryId=null] - Optional delivery UUID to attach a PDF link.
 * @param {string} [type='preview'] - 'preview' (Preparation) or 'receipt'
 * @returns {Promise<Object>} - API response
 */
export const sendTextMagicSMS = async (phone, message, deliveryId = null, type = 'preview') => {
  // If requested, force-inject the absolute production link directly into the payload
  let finalMessage = message;
  if (deliveryId) {
    const origin = window.location.origin.includes('localhost') 
      ? 'https://caravana-delivery-schedule.vercel.app' 
      : window.location.origin;
    const link = `${origin}/#view=${type}&id=${deliveryId}`;
    
    // Check if the message already has a placeholder, or just append it
    if (finalMessage.includes('{{LINK}}')) {
      finalMessage = finalMessage.replace('{{LINK}}', link);
    } else if (!finalMessage.includes(link)) {
      finalMessage = `${finalMessage}\n\nView PDF:\n${link}`;
    }
  }

  // Clean phone number to digits only, ensure +1 prefix for US numbers
  const cleanPhone = phone.replace(/\D/g, '');
  const e164 = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
  try {
    const creds = getTMCredentials();
    const resp = await fetch('/proxy-tm/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-TM-Username': creds.username,
        'X-TM-Key': creds.apiKey
      },
      body: JSON.stringify({ 
        text: finalMessage, 
        phones: e164
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
