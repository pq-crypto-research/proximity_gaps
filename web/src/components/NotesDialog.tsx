import { useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import notes from '../../../notes/grand_list_decoding.md?raw';
import notesUrl from '../../../notes/grand_list_decoding.md?url';
import starkNotes from '../../../notes/codes_to_proofs.md?raw';
import starkNotesUrl from '../../../notes/codes_to_proofs.md?url';
import soundnessNotes from '../../../notes/agentic_notes/reed-solomon-soundness.md?raw';
import soundnessNotesUrl from '../../../notes/agentic_notes/reed-solomon-soundness.md?url';

const noteSources = {
  intro: { text: notes, url: notesUrl, filename: 'grand_list_decoding.md' },
  stark: { text: starkNotes, url: starkNotesUrl, filename: 'codes_to_proofs.md' },
  soundness: {
    text: soundnessNotes,
    url: soundnessNotesUrl,
    filename: 'reed-solomon-soundness.md',
  },
};

export default function NotesDialog({
  source,
  onClose,
}: {
  source?: 'stark' | 'soundness';
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const note = noteSources[source ?? 'intro'];
  const filename = note.filename;
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      className="notes-dialog"
      ref={dialog}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="notes-title"
    >
      <div className="notes-dialog-header">
        <div>
          <span className="eyebrow">FROM THE RESEARCH NOTEBOOK</span>
          <h2 id="notes-title">Read the notes</h2>
        </div>
        <button autoFocus className="icon-button" aria-label="Close notes" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="notes-content">
        <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {note.text}
        </Markdown>
      </div>
      <div className="notes-dialog-footer">
        <span>{filename}</span>
        <a className="text-button" href={note.url} download={filename}>
          <Download size={15} /> Download full note
        </a>
      </div>
    </dialog>
  );
}
