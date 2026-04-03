import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sendTextMagicSMS } from '../lib/sms';

export default function CommunicationHub({ delivery, smsMsgDefault, disabled }) {
  const [method, setMethod] = useState('sms'); // 'sms' or 'email'
  const [message, setMessage] = useState(smsMsgDefault || '');
  const [emailAddress, setEmailAddress] = useState(delivery.email || '');
  const [includePdf, setIncludePdf] = useState(true);
  const [status, setStatus] = useState('idle'); // idle, generating, sending, success, error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (status === 'generating' || status === 'sending') return;
    
    if (method === 'sms' && !delivery.phone) {
      setErrorMsg('No phone number attached to this delivery.');
      return;
    }
    if (method === 'email' && !emailAddress) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    try {
      setErrorMsg('');
      let publicUrl = '';
      
      if (includePdf) {
        setStatus('generating');
        const element = document.getElementById('receipt-pdf-template');
        if (!element) throw new Error("Template not found. Please try again.");
        
        const opt = {
          margin:       0,
          filename:     `receipt-${delivery.orderNumber || delivery.id}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        const pdfBlob = await window.html2pdf().from(element).set(opt).output('blob');
        const path = `receipts/${delivery.id}-${Date.now()}.pdf`;
        const { error: uploadErr } = await supabase.storage.from('delivery-photos').upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (uploadErr) throw uploadErr;
        
        const { data } = supabase.storage.from('delivery-photos').getPublicUrl(path);
        publicUrl = data.publicUrl;
      }

      setStatus('sending');
      
      if (method === 'sms') {
        const finalMsg = includePdf ? message.replace('{{RECEIPT_LINK}}', publicUrl) : message;
        await sendTextMagicSMS(delivery.phone, finalMsg);
      } else {
        // Send email (Mock integration as requested to track status, replace with actual SendGrid/Postmark endpoint later)
        console.log(`Sending email to ${emailAddress}${includePdf ? ` with link: ${publicUrl}` : ''}`);
        
        // Simulating email send action since we don't have the API route ready yet
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Example of a real fetch call:
        /*
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailAddress, link: publicUrl, message: message })
        });
        if (!res.ok) throw new Error('Email failed to send');
        */
      }
      
      setStatus('success');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
      
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while sending');
      setStatus('error');
    }
  };

  // Keep the SMS link synced if toggled
  const currentMsg = includePdf ? message : message.replace('{{RECEIPT_LINK}}', '').trim();

  return (
    <div style={{ marginTop: '1.5rem', textAlign: 'left', background: 'var(--bg-color)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>📤 Send Acknowledgment</h3>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button 
          onClick={() => setMethod('sms')}
          style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${method === 'sms' ? '#0b7a4a' : 'var(--border)'}`, background: method === 'sms' ? '#eef7f0' : 'var(--surface)', color: method === 'sms' ? '#0b7a4a' : 'var(--text-light)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          📱 Text Message
        </button>
        <button 
          onClick={() => setMethod('email')}
          style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${method === 'email' ? '#0b7a4a' : 'var(--border)'}`, background: method === 'email' ? '#eef7f0' : 'var(--surface)', color: method === 'email' ? '#0b7a4a' : 'var(--text-light)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          ✉️ Email
        </button>
      </div>

      {method === 'email' && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>Recipient Email:</label>
          <input 
            type="email"
            value={emailAddress}
            onChange={e => setEmailAddress(e.target.value)}
            placeholder="client@example.com"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text-main)' }}
          />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>Customize Message:</label>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-main)' }}>
            <input type="checkbox" checked={includePdf} onChange={e => setIncludePdf(e.target.checked)} />
            Include PDF Link
          </label>
        </div>
        <textarea
          value={currentMsg}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'inherit', resize: 'none', background: 'var(--surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
        />
      </div>

      {errorMsg && (
        <div style={{ padding: '10px 12px', background: '#fef2f2', color: '#c53030', borderRadius: 8, fontSize: 13, marginBottom: 12, fontWeight: 600, borderLeft: '3px solid #c53030' }}>
          {errorMsg}
        </div>
      )}

      {status === 'success' && (
        <div style={{ padding: '10px 12px', background: '#eef7f0', color: '#0b7a4a', borderRadius: 8, fontSize: 13, marginBottom: 12, fontWeight: 600, borderLeft: '3px solid #0b7a4a' }}>
          ✅ {includePdf ? 'Acknowledgment PDF sent successfully' : 'Message sent successfully'} via {method === 'sms' ? 'SMS' : 'Email'}!
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={status === 'generating' || status === 'sending' || disabled}
        className="btn-primary"
        style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 10, border: 'none', cursor: (status === 'generating' || status === 'sending' || disabled) ? 'not-allowed' : 'pointer', background: (status === 'generating' || status === 'sending' || disabled) ? '#999' : '#0b7a4a', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {status === 'generating' ? '⏳ Generating PDF...' : status === 'sending' ? '📤 Sending...' : `Send ${includePdf ? 'PDF ' : ''}via ${method === 'sms' ? 'SMS' : 'Email'}`}
      </button>
    </div>
  );
}
