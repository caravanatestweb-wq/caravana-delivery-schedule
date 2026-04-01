export default function ImagePreviewModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div 
      className="fade-in"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 999999, // Extremely high to cover any modal
        cursor: 'zoom-out',
        padding: 20
      }}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(0,0,0,0.5)', border: '2px solid #fff', color: '#fff',
          width: 44, height: 44, borderRadius: '50%',
          fontSize: 24, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10
        }}
      >
        ×
      </button>

      <img 
        src={imageUrl} 
        alt="Enlarged Preview" 
        style={{
          maxWidth: '100vw', maxHeight: '100vh',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          cursor: 'default' // inside image doesn't force zoom-out cursor
        }}
        onClick={(e) => e.stopPropagation()} // don't close if they click the actual image safely
      />
    </div>
  );
}
