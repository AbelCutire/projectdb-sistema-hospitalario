import React from 'react';

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Proceder', 
  cancelText = 'Cancelar', 
  isDestructive = false,
  isProcessing = false
}) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={onCancel}
        style={{ 
          position: 'fixed', inset: 0, 
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(5px)', 
          zIndex: 2000, animation: 'fadeIn 0.2s ease-out' 
        }} 
      />
      <div style={{ 
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
        width: 'min(400px, 90vw)', background: '#ffffff', borderRadius: 12, 
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)', zIndex: 2001,
        overflow: 'hidden', animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Content Area */}
        <div style={{ padding: '32px 32px 24px', textAlign: 'center' }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: '50%', 
            background: isDestructive ? '#FEF2F2' : '#EFF6FF', 
            color: isDestructive ? '#DC2626' : '#2563EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 20px', border: `1px solid ${isDestructive ? '#FEE2E2' : '#DBEAFE'}`
          }}>
            {isDestructive ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
              </svg>
            )}
          </div>
          
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.3px', marginBottom: 12 }}>
            {title}
          </h3>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '16px 32px 24px', display: 'flex', gap: 12 }}>
          <button 
            onClick={onCancel}
            style={{ 
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: '0.9rem', fontWeight: 500,
              background: '#ffffff', color: '#475569', border: '1px solid #CBD5E1',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isProcessing}
            style={{ 
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: '0.9rem', fontWeight: 500,
              background: isDestructive ? '#DC2626' : '#2563EB', color: 'white', border: 'none',
              cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'all 0.2s', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: isProcessing ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
            onMouseOver={e => !isProcessing && (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={e => !isProcessing && (e.currentTarget.style.opacity = '1')}
          >
            {isProcessing && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="spinner-icon">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
            )}
            {isProcessing ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinner-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
