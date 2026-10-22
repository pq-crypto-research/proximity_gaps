import { ArrowUpRight } from 'lucide-react';
import './FurtherReading.css';

const papers = [
  {
    id: '2026/680',
    title: 'Open Problems in List Decoding and Correlated Agreement',
    authors: 'Gal Arnon, Dan Boneh, and Giacomo Fenzi',
    description:
      'Start here: a survey of the Proximity Prize questions, from list decoding to mutual correlated agreement (MCA).',
  },
  {
    id: '2024/1586',
    title: 'WHIR: Reed–Solomon Proximity Testing with Super-Fast Verification',
    authors: 'Gal Arnon, Alessandro Chiesa, Giacomo Fenzi, and Eylon Yogev',
    description:
      'Introduces MCA in the setting of efficient Reed–Solomon proximity testing and polynomial commitments.',
  },
  {
    id: '2020/654',
    title: 'Proximity Gaps for Reed-Solomon Codes',
    authors: 'Eli Ben-Sasson, Dan Carmon, Yuval Ishai, Swastik Kopparty, and Shubhangi Saraf',
    description:
      'The foundational proximity-gap results for affine spaces, with bounds up to the Johnson list-decoding radius.',
  },
  {
    id: '2025/2110',
    title: 'A note on mutual correlated agreement for Reed-Solomon codes',
    authors: 'Ulrich Haböck',
    description:
      'Extends the Guruswami–Sudan analysis to establish the global agreement property used by MCA.',
  },
  {
    id: '2025/2046',
    title: 'On Reed–Solomon Proximity Gaps Conjectures',
    authors: 'Elizabeth Crites and Alistair Stewart',
    description:
      'Disproves the original up-to-capacity conjectures, proposes modified versions, and connects correlated agreement to list decoding.',
  },
  {
    id: '2026/782',
    title: 'Failure of proximity gaps close to capacity',
    authors: 'Dmitry Krachun, Stepan Kazanin, and Ulrich Haböck',
    description:
      'Counterexamples near capacity on multiplicative subgroups of prime fields, using sums of roots of unity.',
  },
];

export function FurtherReading({ title = 'Further reading' }: { title?: string }) {
  return (
    <section
      id="further-reading"
      className="further-reading"
      aria-labelledby="further-reading-title"
      tabIndex={-1}
    >
      <h2 id="further-reading-title">{title}</h2>
      <p className="further-reading-intro">
        Papers behind the experiments, from Reed–Solomon codes to mutual correlated agreement.
      </p>
      <ol className="reading-list">
        {papers.map((paper) => {
          const url = `https://eprint.iacr.org/${paper.id}`;
          return (
            <li key={paper.id}>
              <div>
                <h3>{paper.title}</h3>
                <p className="reading-authors">{paper.authors}</p>
                <p className="reading-description">{paper.description}</p>
              </div>
              <div className="reading-links">
                <a
                  href={`${url}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${paper.title} (PDF, opens in a new tab)`}
                >
                  PDF <ArrowUpRight size={13} aria-hidden="true" />
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`ePrint ${paper.id} (opens in a new tab)`}
                >
                  ePrint {paper.id}
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
