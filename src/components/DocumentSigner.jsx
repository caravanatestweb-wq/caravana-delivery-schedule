import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabase } from '../lib/supabaseClient';

// Helper to wrap text precisely using pdf-lib font width
const wrapText = (text, font, fontSize, maxWidth) => {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const lines = [];
  
  for (const p of paragraphs) {
    const words = p.split(' ');
    let currentLine = words[0] || '';
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = font.widthOfTextAtSize(currentLine + ' ' + word, fontSize);
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }
  return lines;
};

export default function DocumentSigner({ delivery, onClose }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorObj, setErrorObj] = useState(null);
  const sigCanvas = useRef({});

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const clearSignature = () => {
    sigCanvas.current.clear();
  };

  const handleSaveUpload = async () => {
    if (!file) {
      alert("Please select a valid PDF file.");
      return;
    }
    if (sigCanvas.current.isEmpty()) {
      alert("Please provide a signature.");
      return;
    }

    setIsProcessing(true);
    setErrorObj(null);

    try {
      // 1. Load Original PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // 2. Setup Font & Appendix Page
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = 12;
      const margin = 50;

      // Add a standard Letter page for the Appendix
      const page = pdfDoc.addPage([612, 792]);
      const { width, height } = page.getSize();
      const maxWidth = width - (margin * 2);

      let currentY = height - margin;

      // Draw Title
      page.drawText('ACKNOWLEDGEMENT APPENDIX', {
        x: margin,
        y: currentY,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= 30;

      page.drawText(`Delivery ID: ${delivery?.id || 'N/A'}\nClient Name: ${delivery?.clientName || 'N/A'}`, {
        x: margin,
        y: currentY,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
        lineHeight: 14,
      });
      currentY -= 40;

      // 3. Inject Document Notes
      const notes = delivery?.doc_notes;
      if (notes) {
        page.drawText('Office Document Notes:', {
          x: margin,
          y: currentY,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        currentY -= 20;

        const lines = wrapText(notes, font, fontSize, maxWidth);
        for (const line of lines) {
          page.drawText(line, {
            x: margin,
            y: currentY,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
          currentY -= (fontSize + 4);
        }
        currentY -= 20; // Extra spacing after notes
      }

      // 4. Extract Signature and Stamp It
      const sigDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      const sigImageBytes = await fetch(sigDataUrl).then(res => res.arrayBuffer());
      const signatureImg = await pdfDoc.embedPng(sigImageBytes);

      const sigDims = signatureImg.scale(0.5); // scale down if needed

      page.drawText('Client Signature:', {
        x: margin,
        y: currentY,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= 10;
      
      // Ensure we don't draw off the bottom. If we do, we could add another page, but Appendix is usually enough.
      const startDrawY = currentY - sigDims.height;
      page.drawImage(signatureImg, {
        x: margin,
        y: startDrawY,
        width: sigDims.width,
        height: sigDims.height,
      });

      // Draw standard line under signature
      page.drawLine({
        start: { x: margin, y: startDrawY - 5 },
        end: { x: margin + Math.max(300, sigDims.width), y: startDrawY - 5 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: margin,
        y: startDrawY - 20,
        size: 10,
        font: font,
      });

      // 5. Flatten & Save
      const pdfBytes = await pdfDoc.save();
      const finalBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      // 6. Upload to Supabase Storage
      const fileName = `signed_${delivery?.orderNumber || delivery?.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('signed_documents')
        .upload(fileName, finalBlob, { contentType: 'application/pdf' });

      if (uploadError) throw new Error("Failed to upload document: " + uploadError.message);

      const { data: publicURLData } = supabase.storage
        .from('signed_documents')
        .getPublicUrl(fileName);

      const signed_doc_url = publicURLData.publicUrl;

      // 7. Update Delivery Record (Real-time App.jsx listener will pick this up automatically!)
      const { error: dbError } = await supabase
        .from('deliveries')
        .update({ signed_doc_url })
        .eq('id', delivery.id);

      if (dbError) throw new Error("Failed to link Document to Delivery record: " + dbError.message);

      alert("✅ Document Signed and Uploaded Successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      setErrorObj(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#f8fafc',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem', background: '#fff', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>
          🖋️ Document Signer
        </h2>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', fontSize: '1.5rem',
          cursor: 'pointer', color: '#64748b'
        }}>&times;</button>
      </div>

      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Step 1: File Selection */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#334155' }}>1. Select PDF Document</h3>
            <label style={{
              display: 'block', padding: '1rem', border: '2px dashed #cbd5e1', borderRadius: 8,
              textAlign: 'center', cursor: 'pointer', background: '#f8fafc'
            }}>
              <input type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
              {file ? (
                <div style={{ color: '#0f172a', fontWeight: 600 }}>📄 {file.name}</div>
              ) : (
                <div style={{ color: '#64748b' }}>Tap to browse for PDF on iPad</div>
              )}
            </label>
          </div>

          {/* Delivery Details Overview */}
          {(delivery?.doc_notes || delivery?.clientName) && (
            <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: 12, border: '1px solid #fca5a5' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#991b1b' }}>Delivery Notes (To be Appended)</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>
                {delivery.doc_notes ? delivery.doc_notes : 'No specific notes provided for this delivery.'}
              </p>
            </div>
          )}

          {/* Step 2: Signature */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>2. Client Signature</h3>
              <button type="button" onClick={clearSignature} style={{
                background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 12px',
                borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer', color: '#475569'
              }}>Clear Pad</button>
            </div>
            
            <div style={{ border: '2px solid #e2e8f0', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="#000000"
                canvasProps={{
                  width: 500, height: 200, className: 'sigCanvas',
                  style: { width: '100%', height: '200px', cursor: 'crosshair', touchAction: 'none' }
                }} 
              />
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
              Sign within the box above
            </p>
          </div>

          {errorObj && (
            <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: '0.9rem' }}>
              <strong>Error:</strong> {errorObj}
            </div>
          )}

          {/* Step 3: Save */}
          <button 
            onClick={handleSaveUpload} 
            disabled={isProcessing}
            style={{
              padding: '1.25rem', background: isProcessing ? '#cbd5e1' : '#2563eb', 
              color: '#fff', fontSize: '1.1rem', fontWeight: 700, borderRadius: 12, 
              border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
            }}>
            {isProcessing ? '⏳ Processing Document...' : '💾 Merge & Upload Document'}
          </button>

        </div>
      </div>
    </div>
  );
}
