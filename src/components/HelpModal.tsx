import { IconClose } from './icons';

/**
 * Shared "How to play" modal. Each game describes its rules as a `GameHelp`
 * object (see e.g. games/checkers/help.ts) and passes it to GameShell, which
 * adds a ? button to the control rail and opens this modal.
 */
export type GameHelp = {
  title: string;
  objective: string;
  sections: Array<{ heading: string; items: string[] }>;
};

export function HelpModal({ help, onClose }: { help: GameHelp; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>How to play {help.title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <p className="help-objective">{help.objective}</p>
        {help.sections.map((s) => (
          <div key={s.heading} className="help-group">
            <span className="group-title">{s.heading}</span>
            <ul className="help-list">
              {s.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
