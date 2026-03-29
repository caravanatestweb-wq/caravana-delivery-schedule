// TextMagic API helpers - credentials stored in localStorage
export const getTMCredentials = () => ({
  username: localStorage.getItem('tm_username') || '',
  apiKey:   localStorage.getItem('tm_apikey') || '',
});

/**
 * Sends an SMS via TextMagic REST API v2
 * @param {string} phone - Target phone number
 * @param {string} message - Message text
 * @returns {Promise<Object>} - TextMagic response
 */
export const sendTextMagicSMS = async (phone, message) => {
  const { username, apiKey } = getTMCredentials();
  if (!username || !apiKey) throw new Error('TextMagic credentials not set — go to Settings ⚙️');

  // Clean phone number to digits only, ensure +1 prefix for US numbers
  const cleanPhone = phone.replace(/\D/g, '');
  const e164 = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;

  const resp = await fetch('https://rest.textmagic.com/api/v2/messages', {
    method: 'POST',
    headers: {
      'X-TM-Username': username,
      'X-TM-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: message, phones: e164 }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `TextMagic error ${resp.status}`);
  }
  return await resp.json();
};
