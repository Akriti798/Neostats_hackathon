export default function Alert({ type = 'info', message, onDismiss, action }) {
  if (!message) return null;

  return (
    <div className={`alert-box alert-${type}`}>
      <div className="alert-content">
        <span className="alert-icon">
          {type === 'error' && '❌'}
          {type === 'warning' && '⚠️'}
          {type === 'success' && '✅'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span className="alert-message">{message}</span>
      </div>
      <div className="alert-actions">
        {action}
        {onDismiss && (
          <button className="alert-dismiss" onClick={onDismiss} aria-label="Dismiss">
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
