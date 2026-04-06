import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabase } from '../lib/supabaseClient';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Fix for Vite / react-pdf worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function DocumentSigner({ delivery, onClose }) {
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [driverNotes, setDriverNotes] = useState('');
  const [errorObj, setErrorObj] = useState(null);
  const sigCanvas = useRef({});
  const [capturedSig, setCapturedSig] = useState(null);
  
  // Step 2 State
  const containerRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Drag State
  const [dragPos, setDragPos] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // PDF Rendering State
  const [numPages, setNumPages] = useState(null);
  const [pdfRenderWidth, setPdfRenderWidth] = useState(window.innerWidth > 800 ? 700 : window.innerWidth - 40);

  const isImage = (delivery?.base_doc_url || '').toLowerCase().match(/\.(jpg|jpeg|png)$/i);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setPdfRenderWidth(window.innerWidth > 800 ? 700 : window.innerWidth - 40);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNextStep = () => {
    if (sigCanvas.current.isEmpty()) {
      alert("Please provide a signature first.");
      return;
    }
    const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    setCapturedSig(dataUrl);
    setStep(2);
  };

  const handlePointerDown = (e) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX) return;

    setIsDragging(true);
    setDragOffset({
      x: clientX - dragPos.x,
      y: clientY - dragPos.y
    });
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const sigRect = { width: 140, height: Math.floor(140 * 0.4) }; // Approx aspect ratio of trimmed canvas

    let newX = clientX - dragOffset.x;
    let newY = clientY - dragOffset.y;

    // Constrain to container boundaries
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + sigRect.width > containerRect.width) newX = containerRect.width - sigRect.width;
    if (newY + sigRect.height > containerRect.height) newY = containerRect.height - sigRect.height;

    setDragPos({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    } else {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, dragPos, dragOffset]);

  const handleSaveStamp = async () => {
    if (!containerRef.current) return;
    setIsProcessing(true);
    setErrorObj(null);

    try {
      const containerRect = containerRef.current.getBoundingClientRect();
      const sigVisualWidth = 140;
      const sigVisualHeight = Math.floor(140 * 0.4); // Standardized relative height for the visual box
      
      const pctX = dragPos.x / containerRect.width;
      const pctY = dragPos.y / containerRect.height;
      const pctWidth = sigVisualWidth / containerRect.width;
      const pctHeight = sigVisualHeight / containerRect.height;

      const docRes = await fetch(delivery.base_doc_url);
      const arrayBuffer = await docRes.arrayBuffer();

      let pdfDoc;
      let targetPage;

      if (isImage) {
        pdfDoc = await PDFDocument.create();
        const urlLower = delivery.base_doc_url.toLowerCase();
        let image;
        if (urlLower.includes('.png')) {
          image = await pdfDoc.embedPng(arrayBuffer);
        } else {
          image = await pdfDoc.embedJpg(arrayBuffer);
        }
        targetPage = pdfDoc.addPage([image.width, image.height]);
        targetPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      } else {
        pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        targetPage = pages[pages.length - 1]; // Use last page
      }

      const { width: pdfWidth, height: pdfHeight } = targetPage.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const sigImageBytes = await fetch(capturedSig).then(res => res.arrayBuffer());
      const signatureImg = await pdfDoc.embedPng(sigImageBytes);

      // Coordinate matching strictly via percentages
      const pdfX = pdfWidth * pctX;
      const pdfSigWidth = pdfWidth * pctWidth;
      const pdfSigHeight = pdfHeight * pctHeight;
      const pdfY = pdfHeight - (pdfHeight * (pctY + pctHeight)); // PDF origin is bottom-left

      // Draw Signature
      targetPage.drawImage(signatureImg, {
        x: pdfX,
        y: pdfY,
        width: pdfSigWidth,
        height: pdfSigHeight,
      });

      // Draw Date securely under the signature box
      const fontSize = Math.max(8, Math.min(12, pdfHeight * 0.015));
      targetPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: pdfX,
        y: pdfY - fontSize - 2,
        size: fontSize,
        font: font,
      });

      // Draw Notes natively onto the bottom left if any
      const notes = driverNotes.trim();
      if (notes) {
        const noteFontSize = 10;
        let currentY = pdfHeight * 0.15; // Placed generally near the bottom area
        
        targetPage.drawText('Driver Notes:', {
          x: 20,
          y: currentY,
          size: noteFontSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        currentY -= (noteFontSize + 4);

        const lines = notes.split('\n');
        for (const line of lines) {
          targetPage.drawText(line, {
            x: 20,
            y: currentY,
            size: noteFontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
          currentY -= (noteFontSize + 2);
        }
      }

      // Flatten & Upload
      const pdfBytes = await pdfDoc.save();
      const finalBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      const fileName = `signed_${delivery?.orderNumber || delivery?.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('signed_documents')
        .upload(fileName, finalBlob, { contentType: 'application/pdf' });

      if (uploadError) throw new Error("Upload failed: " + uploadError.message);

      const { data: publicURLData } = supabase.storage
        .from('signed_documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('deliveries')
        .update({ signed_doc_url: publicURLData.publicUrl })
        .eq('id', delivery.id);

      if (dbError) throw new Error("DB Link failed: " + dbError.message);

      alert("✅ Document Timestamped, Merged, and Uploaded Successfully!");
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
          🖋️ MDG Document Signer
        </h2>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', fontSize: '1.5rem',
          cursor: 'pointer', color: '#64748b'
        }}>&times;</button>
      </div>

      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {step === 1 ? (
            <>
              {/* Step 1: Capture */}
              <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#334155' }}>1. Driver Notes (Optional)</h3>
                <textarea
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="Record any missing items, damages etc..."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1.5rem' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>2. Client Signature</h3>
                  <button type="button" onClick={() => sigCanvas.current.clear()} style={{
                    background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 12px',
                    borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer'
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
              </div>

              <button 
                onClick={handleNextStep}
                style={{
                  padding: '1.25rem', background: '#2563eb', color: '#fff', fontSize: '1.1rem', 
                  fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                }}>
                Next: Place Signature ➡️
              </button>
            </>
          ) : (
            <>
              {/* Step 2: Overlay & Stamp */}
              <div style={{ background: '#fff', padding: '1rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#334155' }}>3. Review & Place Signature</h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Drag the signature block below and drop it directly onto the 'National Core Staff' signature line (or equivalent) in the document.
                </p>

                {errorObj && (
                  <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <strong>Error:</strong> {errorObj}
                  </div>
                )}

                <div 
                  ref={containerRef}
                  style={{ 
                    position: 'relative', width: '100%', maxWidth: pdfRenderWidth, margin: '0 auto',
                    border: '1px solid #cbd5e1', background: '#f1f5f9', overflow: 'hidden', touchAction: 'none'
                  }}
                >
                  {/* The Document */}
                  {isImage ? (
                    <img src={delivery.base_doc_url} alt="Base Doc" style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} draggable={false} />
                  ) : (
                    <Document 
                      file={delivery.base_doc_url} 
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                      loading="Loading PDF preview..."
                    >
                      <Page 
                        pageNumber={numPages || 1} 
                        width={containerRef.current ? containerRef.current.clientWidth : pdfRenderWidth} 
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  )}

                  {/* The Draggable Signature Overlay */}
                  <div 
                    onMouseDown={handlePointerDown}
                    onTouchStart={handlePointerDown}
                    style={{
                      position: 'absolute',
                      left: dragPos.x,
                      top: dragPos.y,
                      width: 140,
                      height: Math.floor(140 * 0.4),
                      border: isDragging ? '2px dashed #2563eb' : '2px solid rgba(37, 99, 235, 0.4)',
                      background: 'rgba(255, 255, 255, 0.7)',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      boxShadow: isDragging ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      userSelect: 'none', touchAction: 'none'
                    }}
                  >
                    <img src={capturedSig} alt="Captured Signature" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} draggable={false} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setStep(1)} 
                  disabled={isProcessing}
                  style={{ padding: '1.25rem', background: '#f1f5f9', color: '#475569', fontSize: '1.1rem', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', flex: 1 }}>
                  ⬅️ Back
                </button>
                <button 
                  onClick={handleSaveStamp} 
                  disabled={isProcessing}
                  style={{
                    padding: '1.25rem', background: isProcessing ? '#cbd5e1' : '#0b7a4a', 
                    color: '#fff', fontSize: '1.1rem', fontWeight: 700, borderRadius: 12, 
                    border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer', flex: 2,
                    boxShadow: '0 4px 6px -1px rgba(11, 122, 74, 0.2)'
                  }}>
                  {isProcessing ? '⏳ Flattening Document...' : '💾 Save & Stamp Here'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
