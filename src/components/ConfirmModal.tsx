/**
 * The themed "are you sure?" dialog. Shared because more than the control rail
 * needs it: a game whose shape is changed from Settings mid-play has to ask
 * before throwing the board away.
 *
 * Render it outside `GameShell`'s children — `.board-wrap` is a size container,
 * which makes it the containing block for fixed-position descendants and would
 * trap the backdrop inside the board.
 */
export function ConfirmModal({
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon-wrap">
          <span className="caution-glyph">!</span>
        </div>
        <div className="confirm-title">{title}</div>
        <p className="confirm-text">{text}</p>
        <div className="win-actions">
          <button className="danger-btn" onClick={onConfirm}>{confirmLabel}</button>
          <button className="secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
