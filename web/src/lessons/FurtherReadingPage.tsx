import { lazy, Suspense, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Definition } from '../components/Controls';
import { MathText } from '../components/Math';
import { FurtherReading } from '../components/FurtherReading';
import { BINARY_WORDS, binaryWord, distance, ballSize, termTex } from '../core/math';
import { PRIZE_Q, PRIZE_N } from '../core/proximityPrize';
import { useExperiment } from '../state/ExperimentContext';
import './FurtherReadingPage.css';

const NotesDialog = lazy(() => import('../components/NotesDialog'));
const notebooks = [
  { title: 'Reed–Solomon codes and list decoding', source: undefined },
  { title: 'Agreement and soundness', source: 'soundness' as const },
  { title: 'From codes to proofs', source: 'stark' as const },
];
export default function FurtherReadingPage() {
  const { experiment: e, navigate } = useExperiment();
  const [notebook, setNotebook] = useState<number | null>(null);
  const center = binaryWord(e.ballCenter);
  const points = BINARY_WORDS.map(({ id, word }) => ({
    id: String(id),
    label: word.join(''),
    distance: distance(word, center),
    codeword: e.repetition && (id === 0 || id === 31),
  }));
  return (
    <div className="reference-page">
      <header>
        <h2>Further reading</h2>
        <p>Definitions, research notes, and papers behind the experiments.</p>
        <nav aria-label="Reference sections">
          <a href="#experiment-notes">Definitions</a>
          <a href="#research-notebooks">Research notes</a>
          <a href="#further-reading">Papers</a>
        </nav>
      </header>
      <section id="experiment-notes" aria-labelledby="experiment-notes-title">
        <h3 id="experiment-notes-title">Definitions and explanations</h3>
        <Definition title="Message interpolation, missing symbols, and wrong values">
          <p>
            The opening experiments use five message values over F₂₅₇. Lagrange interpolation finds
            the unique polynomial of degree less than 5 with p(i) = mᵢ for i = 0, …, 4. Evaluating
            it at additional distinct points creates a Reed–Solomon codeword whose first five
            symbols are the original message. This is systematic encoding.
          </p>
          <MathText block>
            {'C=\\operatorname{RS}[\\mathbb F_{257},\\{0,\\ldots,n-1\\},5]'}
          </MathText>
          <p>
            Any five correct evaluations determine the polynomial, even if none of them is at an
            original message position. Interpolate from those survivors, then evaluate at 0, …, 4 to
            recover the message. The channel removes symbols at randomly chosen positions; yellow
            holes mark those known erasures. No particular position has to survive.
          </p>
          <MathText block>
            {
              '\\text{erasures}\\le n-k,\\qquad \\text{unknown errors}\\le\\left\\lfloor\\frac{n-k}{2}\\right\\rfloor'
            }
          </MathText>
          <p>
            With 11 evaluations and k = 5, any 6 missing symbols can be recovered, or any 3
            incorrect values can be corrected without knowing their locations. If both occur, the
            guarantee is 2e + s ≤ n − k, where e counts wrong values and s counts missing ones. Edit
            the received vector to try either kind of damage. Beyond the bound, recovery can fail or
            return a different codeword.
          </p>
          <p>
            The receiver uses only the received values and their evaluation points. The demo
            implements{' '}
            <a
              href="https://cse.buffalo.edu/faculty/atri/courses/coding-theory/lectures/lect37.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Berlekamp–Welch decoding
            </a>
            , omitting missing positions from the equations. It does not consult the original
            message.
          </p>
          <p>
            The demo offers 5–24 evaluations for readability. The field permits up to 257 distinct
            evaluation points. A character entered in a message cell uses its ASCII value; numeric
            input is interpreted as an integer modulo 257. Letters advance through the five message
            cells automatically; pasting a word fills the remaining cells.
          </p>
        </Definition>
        <Definition title="See the coefficient-to-term table">
          <div className="table-scroll">
            <table className="math-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Coefficient</th>
                  <th>Term</th>
                </tr>
              </thead>
              <tbody>
                {e.coefficients.map((value, index) => (
                  <tr key={index}>
                    <td>{index}</td>
                    <td>{value}</td>
                    <td>
                      <MathText>{termTex(value, index, true)}</MathText>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <MathText block>{'p(X)=\\sum_{i=0}^{k-1}a_iX^i,\\qquad \\deg(p)<k'}</MathText>
          <p>
            The dimension k counts coefficient slots, including trailing zeros. A leading zero can
            lower the actual degree without changing k. All arithmetic is modulo {e.q}.
          </p>
        </Definition>
        <Definition title="How polynomial evaluations form a codeword">
          <MathText block>
            {'\\operatorname{Enc}(a_0,\\ldots,a_{k-1})=(p(x_1),\\ldots,p(x_n))'}
          </MathText>
          <p>
            The evaluation points must be distinct field elements. In coefficient encoding, the
            inputs aᵢ supply the polynomial coefficients directly, so its first k evaluations need
            not reproduce those inputs. In message interpolation, we instead choose the polynomial
            to pass through the message values, so including those same points in the output
            preserves the message there. Both methods produce valid Reed–Solomon codewords.
          </p>
          <p>
            In a typical STARK, trace entries are polynomial evaluations. Interpolation finds the
            coefficients before extending the evaluations to a larger domain. See{' '}
            <a
              href="https://medium.com/starkware/arithmetization-ii-403c3b3f4355"
              target="_blank"
              rel="noreferrer"
            >
              StarkWare’s explanation of arithmetization
            </a>
            .
          </p>
        </Definition>
        <Definition title="Hamming distance">
          <MathText block>
            {'\\Delta(c,w)=|\\{i:c_i\\ne w_i\\}|,\\qquad \\delta(c,w)=\\frac{\\Delta(c,w)}n'}
          </MathText>
          <p>
            Hamming distance counts unequal symbols. Changing one wrong symbol to a different wrong
            symbol keeps the distance fixed. Restoring it to the reference value decreases the
            distance by one.
          </p>
        </Definition>
        <Definition title="Hamming balls and their sizes">
          <MathText block>{'B(w,E)=\\{y\\in\\mathbb{F}^n:\\Delta(y,w)\\le E\\}'}</MathText>
          <p>
            A shell contains words at exactly one distance. A ball includes all shells up to its
            radius.
          </p>
          <MathText block>{'|B(w,E)|=\\sum_{j=0}^{E}\\binom{n}{j}(q-1)^j'}</MathText>
          <div className="table-scroll">
            <table className="math-table">
              <thead>
                <tr>
                  <th>Radius</th>
                  <th>Words in the ball</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, radius) => (
                  <tr key={radius}>
                    <td>{radius}</td>
                    <td>{ballSize(5, 2, radius)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>All words and their exact distances</summary>
            <div className="table-scroll">
              <table className="math-table">
                <thead>
                  <tr>
                    <th>Word</th>
                    <th>Distance</th>
                    <th>Membership</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.id}>
                      <td>{point.label}</td>
                      <td>{point.distance}</td>
                      <td>
                        {point.distance <= e.ballRadius ? 'Inside' : 'Outside'}
                        {point.codeword ? ' · codeword' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Definition>
        <Definition title="What the list guarantees">
          <MathText block>{'\\Lambda(C,w,E)=\\{c\\in C:\\Delta(c,w)\\le E\\}'}</MathText>
          <p>
            The list contains all codewords within the radius, including any that are farther away
            than the nearest one. If the transmitted codeword suffered at most E errors, it is in
            this list. Without that assumption, the original codeword can be outside it.
          </p>
          <p>
            List decoding does not select the original message when several candidates remain.
            Selecting one requires additional information. It also does not give each candidate a
            probability.
          </p>
          <p>
            For a fixed received word, increasing E cannot shrink the list. A large radius may
            produce a large list. Coding theory asks for bounds that hold for every received word,
            not just the example shown here.
          </p>
          <p>
            This small demo finds candidates by checking the codebook when feasible. Efficient
            algebraic list-decoding algorithms are a separate topic.
          </p>
        </Definition>
        <Definition title="Uniqueness, distance, and STARK soundness">
          <MathText block>
            {'d=n-k+1,\\qquad t=\\left\\lfloor\\frac{d-1}{2}\\right\\rfloor'}
          </MathText>
          <p>
            If two codewords were both within distance t of w, their mutual distance would be at
            most 2t, less than d. This guarantees at most one nearby codeword, not that a codeword
            exists.
          </p>
          <p>
            A unique nearby polynomial does not establish a valid STARK proof. The full protocol
            also checks commitments and computation constraints. Lists enter the soundness analysis;
            the ordinary verifier does not enumerate them.
          </p>
          <p>
            Distances here are measured from the center w. Angles and distances between other
            plotted points have no mathematical meaning. Full enumeration is bounded at 10,000
            codewords and 250,000 coordinate evaluations. Some counts can still be determined
            exactly by interpolation or minimum distance.
          </p>
        </Definition>
        <Definition title="Why the intersection matters">
          <p>
            For each row, let <MathText>{'T_j=\\{x:p_j(x)=w_j(x)\\}'}</MathText>. A column agrees
            exactly on <MathText>{'T=\\bigcap_j T_j'}</MathText>, so the interleaved distance is{' '}
            <MathText>{'\\Delta=n-|T|'}</MathText>.
          </p>
          <p>
            Separate rows can each be close to an RS codeword while agreeing on different positions.
            Mutual agreement needs the same positions for every row. This comparison uses the
            displayed reference matrix; it does not search for the nearest interleaved codeword.
          </p>
          <p>
            Identifying a column with an extension-field element requires a basis. It does not
            automatically enlarge the field from which a protocol samples its challenge.
          </p>
          <button className="text-button" onClick={() => navigate('mutual-correlated-agreement')}>
            Explore MCA <ArrowRight size={15} />
          </button>
        </Definition>
        <Definition title="Why can two non-codewords make a codeword?">
          <p>
            This code uses <MathText>{'D=\\{1,2,4,8,16,15,13,9\\}'}</MathText> over{' '}
            <MathText>{'\\mathbb F_{17}'}</MathText>. Its codewords are the evaluations of{' '}
            <MathText>{'p(X)=a+bX'}</MathText>, including constant and zero polynomials.
          </p>
          <p>
            In the starting example, f matches p(X) = X except at x = 16, where its value is 1. The
            vector g is zero except at that same point, where its value is 5. Choosing α = 3 repairs
            that entry: 1 + 3 × 5 = 16. Neither input is a codeword, but their combination is.
          </p>
          <p>
            If two distinct choices of α produced codewords, subtracting them would show that g is a
            codeword, and then f would be one too. So if either input is not a codeword, at most one
            of the 17 choices can produce a codeword. If both inputs are codewords, every choice
            works.
          </p>
        </Definition>
        <Definition title="Why this is an MCA error">
          <p>
            The code evaluates polynomials of degree less than 2 on{' '}
            <MathText>{'D=\\{1,2,4,8,16,15,13,9\\}'}</MathText> in{' '}
            <MathText>{'\\mathbb F_{17}'}</MathText>. We fix δ = 1/4, so a qualifying agreement set
            contains at least six points.
          </p>
          <p>
            For the starting vectors, c, u₀, and u₁ are all the zero codeword. At α = 10, the
            combination becomes zero at x = 13, but neither input is zero there. At α = 3, the same
            thing happens at x = 9. These are the only two failing challenges.
          </p>
          <p>
            The test asks whether <em>any</em> codewords fit f and g throughout S. It does not
            require their agreement sets to equal S: extra agreement outside S is fine. We check all
            289 codewords for possible explanations.
          </p>
          <p>
            The minimum codeword distance is 7, so two distinct codewords cannot both be within two
            errors of h. At this threshold, a qualifying c is therefore the unique nearest codeword.
            Likewise, if a codeword explains an input on S, it is that input’s unique nearest
            codeword. If h is further than two errors from the code, there is no qualifying set. Any
            tied nearest codeword can be displayed in that case.
          </p>
          <p>
            Checking the full agreement set S also checks every sufficiently large subset: a
            codeword matching all of S matches each subset too. The probability shown is exact for
            the current vectors, not a worst-case bound over all vectors.
          </p>
          <p>
            Example:{' '}
            <a
              href="https://hackmd.io/@-urCr-W9R8mS-UktGXSzbQ/S1_dP1Z3Mg"
              target="_blank"
              rel="noreferrer"
            >
              Mutual Correlated Agreement (MCA) for Dummies
            </a>
            .
          </p>
        </Definition>
        <Definition title="Why call it probability?">
          {' '}
          <p>
            <strong>Why “probability”?</strong> α is sampled uniformly: 2 bad values out of 5 give
            an exact 2/5 chance of an MCA error. Brute force computes this probability; the
            randomness comes from choosing α, not from a missing formula.
          </p>
        </Definition>
        <Definition title="Exact computation, the δ boundary, and the real Proximity Prize">
          <p>
            Brute-force computed in your browser:{' '}
            {(PRIZE_Q ** (2 * PRIZE_N)).toLocaleString('en-US')} input pairs × 5 challenges × 5
            codewords. These are exact counts, not random samples. The chart takes the largest
            failure probability over all input pairs.
          </p>
          <p>
            Between thresholds the probability is constant. Every{' '}
            <MathText>{'0\\le\\delta<1/2'}</MathText> meets the toy target. At δ = 1/2 the
            worst-case error becomes 1, so 1/4 is the largest tested grid value and 1/2 is the
            excluded boundary.
          </p>
          <p>
            For each α, all five codewords are checked. One failing S makes α bad; a failing witness
            is shown if one exists. u₀ and u₁ are chosen to best match that S.
          </p>
          <section className="prize-explainer" aria-label="The real Proximity Prize">
            <h3>From a tiny example to the real question</h3>
            <MathText block>
              {
                '\\varepsilon_{\\mathrm{mca}}(C,\\delta)=\\max_{f,g}\\Pr_{\\alpha\\leftarrow\\mathbb F}[\\mathrm{MCA\\ failure}]\\le\\varepsilon^*'
              }
            </MathText>
            <p>
              The{' '}
              <a href="https://proximityprize.org/" target="_blank" rel="noreferrer">
                Grand MCA challenge
              </a>{' '}
              asks how large δ can be while this worst-case error stays below a target such as{' '}
              <MathText>{'\\varepsilon^*=2^{-128}'}</MathText>. This page uses 2/5 so the change is
              visible.
            </p>
            <p>
              Here C has just five codewords. In a large Reed–Solomon code,{' '}
              <MathText>{'|C|=|\\mathbb F|^k'}</MathText>, and there are{' '}
              <MathText>{'|\\mathbb F|^{2n}'}</MathText> input pairs. Exhaustive enumeration is
              computationally infeasible at cryptographic sizes. The research goal is a provable
              formula or tight bound that applies to every pair, without enumerating them.
            </p>
          </section>
        </Definition>
        <Definition title="Why the worst-case example changes with δ">
          <p>
            For each δ, the page can load a pair attaining the worst-case error. These can be
            different pairs. Turn off “Follow worst pair” to keep f and g fixed while changing δ;
            editing either vector also turns it off.
          </p>
          <p>
            If a fixed pair has a challenge α₀ with{' '}
            <MathText>{'h_{\\alpha_0}=f+\\alpha_0 g\\in C'}</MathText>, then any agreement of{' '}
            <MathText>{'h_\\alpha'}</MathText> with a codeword c on S, for{' '}
            <MathText>{'\\alpha\\ne\\alpha_0'}</MathText>, gives explanations
          </p>
          <MathText block>
            {'u_1=(c-h_{\\alpha_0})/(\\alpha-\\alpha_0),\\qquad u_0=h_{\\alpha_0}-\\alpha_0 u_1'}
          </MathText>
          <p>
            Both are codewords by linearity and match g and f on S. Only α₀ can fail, at any δ. If f
            and g are codewords, no challenge fails. Thus a fixed pair with a qualifying set at δ =
            0 cannot gain new failing challenges as δ grows.
          </p>
        </Definition>
        <Definition title="Why these parameters work">
          <p>
            <MathText>
              {'C=\\operatorname{RS}[\\mathbb F_5,D,1],\\quad D=\\{1,2,4,3\\}=\\langle2\\rangle'}
            </MathText>
            . The domain is a multiplicative subgroup of order <MathText>{'4=2^2'}</MathText>:
            successive powers of 2 modulo 5 return to 1. Its order is a power of two, so it is
            smooth and FFT-friendly. The MCA page’s eight-point domain over F₁₇ is also smooth.
          </p>
          <p>
            With k = 1, polynomials are constant and the rate is 1/4. C consists of [0,0,0,0],
            [1,1,1,1], …, [4,4,4,4]. This makes every nearest-codeword comparison visible.
          </p>
          <p>
            A larger δ permits smaller S. Several codewords may then qualify. We check the full
            agreement set with every c, and whether any u₀ and u₁ explain the inputs on that same
            set. If explanations exist on a full agreement set, they also work on every subset.
            Differences outside S are allowed.
          </p>
          <p>
            The displayed pair can be much better than the worst pair. Editing f and g changes the
            pair’s probability; the worst-case curve depends only on C and δ. “Load worst pair”
            supplies an input pair attaining the exhaustive maximum at the selected threshold.
          </p>
        </Definition>
        <Definition title="What the full FRI protocol adds">
          <p>
            The prover commits to each table with a Merkle root. Challenges determine folds; queries
            are chosen after the layer commitments. FRI checks authenticated openings across several
            rounds and the degree of a small final polynomial.
          </p>
          <MathText block>{'p(X)=p_{\\rm even}(X^2)+X p_{\\rm odd}(X^2)'}</MathText>
          <MathText block>{'g(Y)=p_{\\rm even}(Y)+\\alpha p_{\\rm odd}(Y)'}</MathText>
          <p>
            Here you choose the challenge and pair to inspect the arithmetic. Merkle authentication,
            Fiat–Shamir, and the remaining rounds are omitted. A full STARK also checks the
            computation constraints and adds masking for zero knowledge.
          </p>
          <p>
            See the{' '}
            <a href="https://eccc.weizmann.ac.il/report/2017/134/" target="_blank" rel="noreferrer">
              FRI paper
            </a>{' '}
            and this{' '}
            <a
              href="https://aszepieniec.github.io/stark-anatomy/fri.html"
              target="_blank"
              rel="noreferrer"
            >
              worked folding construction
            </a>
            .
          </p>
        </Definition>
      </section>
      <section id="research-notebooks" aria-labelledby="research-notebooks-title">
        <h3 id="research-notebooks-title">Research notes</h3>
        <div className="reference-notebooks">
          {notebooks.map((note, i) => (
            <button key={note.title} onClick={() => setNotebook(i)}>
              <BookOpen size={16} aria-hidden="true" />
              <span>{note.title}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <FurtherReading title="Papers" />
      {notebook !== null && (
        <Suspense fallback={<p role="status">Opening the notes…</p>}>
          <NotesDialog {...notebooks[notebook]} onClose={() => setNotebook(null)} />
        </Suspense>
      )}
    </div>
  );
}
