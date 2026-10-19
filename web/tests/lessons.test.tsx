import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { ExperimentProvider } from '../src/state/ExperimentContext';
import { defaultExperiment, experimentUrl, type LessonId } from '../src/state/model';

function start(lesson: LessonId = 'tape-polynomial', experiment = defaultExperiment()) {
  window.history.replaceState(null, '', experimentUrl(lesson, experiment));
  return render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
}

beforeEach(() => window.history.replaceState(null, '', '/'));

describe('interactive lessons', () => {
  it('edits coefficients, adds slots, preserves them through navigation, and renders valid math', async () => {
    const user = userEvent.setup();
    const { container } = start();
    const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.clear(first);
    await user.type(first, '6');
    await user.click(screen.getByRole('button', { name: 'Add coefficient' }));
    expect(screen.getByRole('spinbutton', { name: 'Message, coefficient 3' })).toHaveValue(0);
    const codewordLink = screen.queryByRole('link', { name: /02 Build a codeword/ });
    expect(codewordLink, 'The second lesson must have a named navigation link').not.toBeNull();
    await user.click(codewordLink!);
    await screen.findByRole('slider', { name: 'Evaluation points' });
    expect(screen.getByRole('combobox', { name: /Code rate/ })).toHaveValue('8');
    expect(
      within(screen.getByRole('group', { name: 'Codeword' })).getAllByText('6').length,
    ).toBeGreaterThan(0);
    expect(container.querySelector('.katex-error')).toBeNull();
    expect(container.querySelector('math')).not.toBeNull();
  });
  it('keeps the message from step one after trying decoding presets', async () => {
    const user = userEvent.setup();
    start();
    const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.clear(first);
    await user.type(first, '6');
    await user.click(screen.getByRole('link', { name: /05 / }));
    await user.click(await screen.findByRole('button', { name: 'Why a list?' }));
    await user.click(screen.getByRole('button', { name: /Load 2 errors/ }));
    expect(screen.getByTestId('candidate-count')).toHaveTextContent(/^1$/);
    await user.click(screen.getByRole('button', { name: /Load 3 errors/ }));
    expect(screen.getByTestId('candidate-count')).toHaveTextContent(/^2$/);
    await user.click(screen.getByRole('button', { name: 'Three-error example' }));
    const firstLink = screen.getByRole('link', { name: /01 Tape to polynomial/ });
    const target = new URL(firstLink.getAttribute('href')!, window.location.origin);
    expect(JSON.parse(target.searchParams.get('s')!).coefficients).toEqual([6, 2, 1]);
    await user.click(firstLink);
    expect(await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' })).toHaveValue(
      6,
    );
    await user.click(screen.getByRole('link', { name: /02 Build a codeword/ }));
    expect(
      await screen.findByRole('button', { name: 'Codeword, position 1, value 6' }),
    ).toBeInTheDocument();
  });
  it('keeps the latest message when browsing back and forward through lessons', async () => {
    const user = userEvent.setup();
    start();
    await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.click(screen.getByRole('link', { name: /02 Build a codeword/ }));
    await screen.findByRole('slider', { name: 'Evaluation points' });
    await user.click(screen.getByRole('link', { name: /01 Tape to polynomial/ }));
    const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.clear(first);
    await user.type(first, '6');
    await act(async () => window.history.back());
    expect(
      await screen.findByRole('button', { name: 'Codeword, position 1, value 6' }),
    ).toBeInTheDocument();
    await act(async () => window.history.back());
    expect(await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' })).toHaveValue(
      6,
    );
    await act(async () => window.history.forward());
    expect(
      await screen.findByRole('button', { name: 'Codeword, position 1, value 6' }),
    ).toBeInTheDocument();
  });
  it('keeps the original field and message after reloading an FFT preset', async () => {
    const user = userEvent.setup();
    const { unmount } = start('tape-polynomial', defaultExperiment(5));
    const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.clear(first);
    await user.type(first, '4');
    await user.click(screen.getByRole('link', { name: /From codes to proofs/ }));
    await user.click(await screen.findByRole('button', { name: /Load the F₁₇ FFT example/ }));
    expect(screen.getByRole('combobox', { name: 'Load field preset' })).toHaveValue('17');
    // Remount using the current URL and history entry, as a page reload would.
    unmount();
    render(
      <ExperimentProvider>
        <App />
      </ExperimentProvider>,
    );
    await screen.findByRole('group', { name: 'From codes to proofs stages' });
    await user.click(screen.getByRole('link', { name: /01 Tape to polynomial/ }));
    expect(await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' })).toHaveValue(
      4,
    );
    expect(screen.getByRole('combobox', { name: 'Load field preset' })).toHaveValue('5');
  });
  it('allows an explicit reset to clear the saved message during a preset', async () => {
    const user = userEvent.setup();
    start();
    const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.clear(first);
    await user.type(first, '6');
    await user.click(screen.getByRole('link', { name: /05 / }));
    await user.click(await screen.findByRole('button', { name: 'Three-error example' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('link', { name: /01 Tape to polynomial/ }));
    expect(await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' })).toHaveValue(
      3,
    );
  });
  it.each(['Delete', 'Backspace'])(
    'edits digits with %s without removing a coefficient',
    async (key) => {
      const user = userEvent.setup();
      start();
      const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
      const tape = within(screen.getByRole('group', { name: 'Message' }));
      await user.clear(first);
      await user.type(first, '10');
      await user.keyboard(key === 'Delete' ? '{ArrowLeft}{Delete}' : '{Backspace}');
      expect(first).toHaveValue(1);
      expect(tape.getAllByRole('spinbutton')).toHaveLength(3);
      expect(screen.getByLabelText('Polynomial: 1 + 2X + X^{2}')).toBeInTheDocument();
      await user.clear(first);
      expect(first).toHaveValue(null);
      await user.tab();
      expect(first).toHaveValue(1);
      expect(tape.getAllByRole('spinbutton')).toHaveLength(3);
    },
  );
  it('also removes coefficient slots through the explicit control and keeps one cell', async () => {
    const user = userEvent.setup();
    start();
    await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.click(screen.getByRole('button', { name: 'Remove last coefficient' }));
    expect(screen.getByLabelText('Polynomial: 3 + 2X')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove last coefficient' }));
    expect(screen.queryByRole('button', { name: 'Remove last coefficient' })).toBeNull();
    expect(
      within(screen.getByRole('group', { name: 'Message' })).getAllByRole('spinbutton'),
    ).toHaveLength(1);
  });
  it.each(['Delete', 'Backspace'])(
    'removes an already empty cell with %s and focuses the next coefficient',
    async (key) => {
      const user = userEvent.setup();
      start();
      const middle = await screen.findByRole('spinbutton', { name: 'Message, coefficient 1' });
      const tape = within(screen.getByRole('group', { name: 'Message' }));
      await user.click(middle);
      if (key === 'Delete') await user.keyboard('{ArrowLeft}');
      await user.keyboard(`{${key}}`);
      expect(middle).toHaveValue(null);
      expect(tape.getAllByRole('spinbutton')).toHaveLength(3);
      await user.keyboard(`{${key}}`);
      expect(tape.getAllByRole('spinbutton')).toHaveLength(2);
      const next = tape.getByRole('spinbutton', { name: 'Message, coefficient 1' });
      expect(next).toHaveValue(1);
      expect(next).toHaveFocus();
      expect(screen.getByLabelText('Polynomial: 3 + X')).toBeInTheDocument();
      expect(JSON.parse(new URLSearchParams(window.location.search).get('s')!)).toMatchObject({
        coefficients: [3, 1],
      });
      await user.clear(next);
      await user.keyboard(`{${key}}`);
      const remaining = tape.getByRole('spinbutton', { name: 'Message, coefficient 0' });
      expect(remaining).toHaveValue(3);
      expect(remaining).toHaveFocus();
      await user.clear(remaining);
      await user.keyboard(`{${key}}`);
      expect(tape.getAllByRole('spinbutton')).toHaveLength(1);
      await user.type(remaining, '20');
      await user.keyboard('{Enter}');
      expect(remaining).toHaveValue(3);
    },
  );
  it('restores the next coefficient when deleting a blank cell with an identical neighbor', async () => {
    const user = userEvent.setup();
    start('tape-polynomial', { ...defaultExperiment(), coefficients: [3, 3, 1] });
    const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.click(first);
    await user.keyboard('{Backspace}{Backspace}');
    expect(first).toHaveFocus();
    expect(first).toHaveValue(3);
    expect(
      within(screen.getByRole('group', { name: 'Message' })).getAllByRole('spinbutton'),
    ).toHaveLength(2);
    await user.clear(first);
    await user.type(first, '35');
    await user.keyboard('{Enter}');
    expect(first).toHaveValue(1);
  });
  it.each([5, 7, 17])(
    'wraps integers modulo F_%s on Enter and blur, preserving the full typed value',
    async (q) => {
      const user = userEvent.setup();
      start('tape-polynomial', defaultExperiment(q));
      const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
      await user.clear(first);
      await user.type(first, String(q * 10 + 3));
      expect(first).toHaveValue(q * 10 + 3);
      expect(first).toHaveAttribute('aria-invalid', 'false');
      await user.keyboard('{Enter}');
      expect(first).toHaveValue(3);
      await user.clear(first);
      await user.type(first, '-1');
      await user.tab();
      expect(first).toHaveValue(q - 1);
      expect(JSON.parse(new URLSearchParams(window.location.search).get('s')!)).toMatchObject({
        q,
        coefficients: [q - 1, 2, 1],
      });
      await user.clear(first);
      await user.type(first, String(q));
      await user.tab();
      expect(first).toHaveValue(0);
    },
  );
  it('reduces pasted integers beyond the safe Number range without rounding them first', async () => {
    const user = userEvent.setup();
    start();
    const first = await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    fireEvent.change(first, { target: { value: '9007199254740993' } });
    await user.click(first);
    await user.keyboard('{Enter}');
    expect(first).toHaveValue(16);
    expect(screen.getByLabelText('Polynomial: 16 + 2X + X^{2}')).toBeInTheDocument();
  });
  it('changes the exact rate and output length together', async () => {
    start('evaluation-codeword');
    const slider = await screen.findByRole('slider', { name: 'Evaluation points' });
    fireEvent.change(slider, { target: { value: '12' } });
    expect(screen.getByRole('combobox', { name: /Code rate/ })).toHaveValue('12');
    expect(
      within(screen.getByRole('group', { name: 'Codeword' })).getAllByText(/^\d+$/).length,
    ).toBe(24);
    fireEvent.change(slider, { target: { value: '3' } });
    expect(
      screen.getByText('0 redundant symbols · the polynomial stays fixed.'),
    ).toBeInTheDocument();
  });
  it('allows two different wrong symbols without changing Hamming distance', async () => {
    const user = userEvent.setup();
    start('hamming-distance');
    const input = await screen.findByRole('spinbutton', { name: 'Received word, position 1' });
    await user.click(input);
    await user.keyboard('{Delete}{Backspace}');
    await user.type(input, '16');
    expect(
      within(screen.getByRole('group', { name: 'Received word' })).getAllByRole('spinbutton'),
    ).toHaveLength(8);
    expect(screen.getByLabelText('1 of 8 positions differ')).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, '2');
    expect(screen.getByLabelText('1 of 8 positions differ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByLabelText('0 of 8 positions differ')).toBeInTheDocument();
  });
  it('expands the complete binary universe and changes its center', async () => {
    const user = userEvent.setup();
    const { container } = start('hamming-ball');
    const slider = await screen.findByRole('slider', { name: 'Hamming radius' });
    fireEvent.change(slider, { target: { value: '5' } });
    expect(container.querySelectorAll('.ball-point.is-inside')).toHaveLength(32);
    fireEvent.change(slider, { target: { value: '0' } });
    expect(container.querySelectorAll('.ball-point.is-inside')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '11111, distance 5, outside the ball' }));
    await user.click(screen.getByRole('button', { name: 'Use as center' }));
    expect(container.querySelectorAll('.ball-point.is-inside')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: '11111, distance 0, inside the ball' }),
    ).toBeInTheDocument();
  });
  it('explains list decoding and loads exact unique and ambiguous examples', async () => {
    const user = userEvent.setup();
    const { container } = start('decoding-radius', defaultExperiment(5));
    expect(
      await screen.findByRole('heading', { name: 'List decoding', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Received word, distance filter, candidate list' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Why a list?' }));
    await user.click(screen.getByRole('button', { name: /Load 2 errors/ }));
    expect(screen.getByTestId('candidate-count')).toHaveTextContent(/^1$/);
    expect(screen.getByRole('slider', { name: 'Search radius' })).toHaveValue('2');
    expect(screen.getByText('Exactly one codeword fits this word and radius.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Load 3 errors/ }));
    expect(screen.getByTestId('candidate-count')).toHaveTextContent(/^2$/);
    expect(screen.getByRole('slider', { name: 'Search radius' })).toHaveValue('3');
    const before = JSON.parse(new URLSearchParams(window.location.search).get('s')!).received;
    fireEvent.change(screen.getByRole('slider', { name: 'Search radius' }), {
      target: { value: '2' },
    });
    expect(screen.getByTestId('candidate-count')).toHaveTextContent(/^0$/);
    expect(JSON.parse(new URLSearchParams(window.location.search).get('s')!).received).toEqual(
      before,
    );
    await user.click(screen.getByRole('button', { name: 'In a STARK' }));
    expect(screen.getByText('Soundness analysis')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load 3 errors/ })).toBeNull();
    await user.click(screen.getByText('What the list guarantees'));
    expect(container.querySelector('.katex-error')).toBeNull();
  });
  it('reveals genuine ambiguity and supports an independent empty search radius', async () => {
    const user = userEvent.setup();
    const { container } = start('decoding-radius');
    await user.click(await screen.findByText('Change the received table'));
    const slider = screen.getByRole('slider', { name: 'Introduced errors' });
    fireEvent.change(slider, { target: { value: '2' } });
    expect(screen.getByTestId('candidate-count')).toHaveTextContent('1');
    fireEvent.change(slider, { target: { value: '3' } });
    expect(screen.getByTestId('candidate-count')).toHaveTextContent('2');
    expect(screen.getByText('E > t: several codewords may fit.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: 'Search radius' }), {
      target: { value: '0' },
    });
    expect(screen.getByTestId('candidate-count')).toHaveTextContent('0');
    expect(container.querySelector('.katex-error')).toBeNull();
  });
  it('keeps the reference visible and distinguishes an unknown list from an empty one', async () => {
    const user = userEvent.setup();
    const { container } = start('decoding-radius', {
      ...defaultExperiment(),
      coefficients: [3, 2, 1, 0],
    });
    await screen.findByRole('slider', { name: 'Search radius' });
    expect(screen.getByTestId('candidate-count')).toHaveTextContent(/^1$/);
    expect(container.querySelector('.center-marker')).toHaveTextContent('w = c');
    fireEvent.change(screen.getByRole('slider', { name: 'Search radius' }), {
      target: { value: '5' },
    });
    expect(screen.getByTestId('candidate-count')).toHaveTextContent('Count unavailable');
    expect(screen.getByRole('button', { name: /Reference codeword/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load a small exact example' }));
    expect(screen.getByTestId('candidate-count')).toHaveTextContent(/^1$/);
    expect(screen.queryByText('Count unavailable')).toBeNull();
  });
  it('inspects candidates beyond the initially drawn subset', async () => {
    const user = userEvent.setup();
    const { container } = start('decoding-radius', {
      ...defaultExperiment(5),
      coefficients: [3, 2, 1],
      n: 5,
      received: [3, 1, 1, 3, 2],
      radius: 5,
      linked: false,
    });
    await screen.findByRole('slider', { name: 'Search radius' });
    expect(screen.getByTestId('candidate-count')).toHaveTextContent(/^125$/);
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: /Show more/ }));
    const candidates = screen.getByRole('group', { name: 'Nearby candidate polynomials' });
    const drawn = [...container.querySelectorAll('.ball-point')].map((point) =>
      point.getAttribute('aria-label'),
    );
    const candidateButtons = within(candidates)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-label')?.startsWith('Inspect codeword'));
    const wordFor = (button: HTMLElement) => {
      const coefficients = button
        .getAttribute('aria-label')!
        .match(/coefficients (.+), distance/)![1]
        .split(', ')
        .map(Number);
      return Array.from(
        { length: 5 },
        (_, x) => (coefficients[0] + coefficients[1] * x + coefficients[2] * x * x) % 5,
      );
    };
    const target = candidateButtons.find(
      (button) =>
        !drawn.some((description) => description?.includes('[' + wordFor(button).join(', ') + ']')),
    )!;
    expect(target).toBeDefined();
    await user.click(target);
    expect(target).toHaveAttribute('aria-pressed', 'true');
    const selected = screen.getByRole('group', { name: 'Selected candidate' });
    const values = [...selected.querySelectorAll('.tape-cell')].map((cell) =>
      Number(cell.textContent),
    );
    expect(values).toEqual(wordFor(target));
    expect(
      screen.getByRole('button', {
        name:
          '[' +
          values.join(', ') +
          '], distance ' +
          target.getAttribute('aria-label')!.split('distance ')[1] +
          ', inside ball',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
  it('selects an output symbol and highlights the corresponding evaluation', async () => {
    const user = userEvent.setup();
    start('evaluation-codeword');
    await user.click(await screen.findByRole('button', { name: 'Codeword, position 5, value 10' }));
    expect(screen.getByRole('button', { name: 'Inspect evaluation at 4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('SUBSTITUTE X = 4 · MODULO 17')).toBeInTheDocument();
  });
  it('restores a shared route on history navigation', async () => {
    start();
    await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    const restored = defaultExperiment();
    restored.ballRadius = 4;
    act(() => {
      window.history.pushState(null, '', experimentUrl('hamming-ball', restored));
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByRole('slider', { name: 'Hamming radius' })).toHaveValue('4');
  });
  it('renders the source note and restores the interface when closed', async () => {
    const user = userEvent.setup();
    const { container } = start();
    await screen.findByRole('spinbutton', { name: 'Message, coefficient 0' });
    await user.click(screen.getByRole('button', { name: /Explore the definition/ }));
    expect(await screen.findByRole('dialog', { name: 'Read the notes' })).toHaveAttribute('open');
    expect(screen.getByRole('link', { name: /Download full note/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close notes' }));
    await waitFor(() => expect(container.querySelector('dialog')).toBeNull());
  });
});
