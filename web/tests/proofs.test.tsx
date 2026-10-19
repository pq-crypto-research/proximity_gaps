import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../src/App';
import { ExperimentProvider } from '../src/state/ExperimentContext';
import { DEFAULT_PROOF, defaultExperiment, experimentUrl } from '../src/state/model';

function start(experiment = defaultExperiment()) {
  window.history.replaceState(null, '', experimentUrl('codes-to-proofs', experiment));
  return render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
}

describe('from codes to proofs', () => {
  it('edits trace evaluations, interpolates the polynomial, and changes the extension domain', async () => {
    const user = userEvent.setup();
    const { container } = start();
    const traceValue = await screen.findByRole('spinbutton', { name: 'Trace values, position 2' });
    expect(traceValue).toHaveValue(10);
    expect(screen.getByRole('link', { name: '09 From codes to proofs' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await user.clear(traceValue);
    await user.type(traceValue, '9');
    await user.click(screen.getByRole('button', { name: 'Prover: Interpolate' }));
    expect(
      screen.getByLabelText('Interpolated polynomial: 7 + 3X + 14X^{2} + 16X^{3}'),
    ).toBeInTheDocument();
    const coefficientCells = screen
      .getByRole('group', { name: 'Interpolated coefficients' })
      .querySelectorAll('.tape-cell');
    expect(Array.from(coefficientCells, (cell) => cell.textContent)).toEqual([
      '7',
      '3',
      '14',
      '16',
    ]);
    await user.click(screen.getByText('See the Lagrange interpolation'));
    expect(screen.getByRole('group', { name: 'Interpolation trace' })).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Lagrange trace values, position 3, value 2' }),
    );
    expect(
      Array.from(
        screen
          .getByRole('group', { name: 'Lagrange basis evaluations' })
          .querySelectorAll('.tape-cell'),
        (cell) => cell.textContent,
      ),
    ).toEqual(['0', '0', '1', '0']);
    await user.click(screen.getByRole('button', { name: 'Prover: Extend' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'STARK blowup factor' }), '4');
    expect(
      screen.getByRole('group', { name: 'STARK codeword' }).querySelectorAll('.tape-cell'),
    ).toHaveLength(16);
    expect(JSON.parse(new URLSearchParams(window.location.search).get('s')!)).toMatchObject({
      coefficients: [7, 3, 14, 16],
      proof: { stage: 2, extension: 4 },
    });
    expect(container.querySelector('.katex-error')).toBeNull();
  });
  it('reveals just one queried fold and distinguishes a missed alteration from a failed relation', async () => {
    const user = userEvent.setup();
    const { container } = start({ ...defaultExperiment(), proof: { ...DEFAULT_PROOF, stage: 3 } });
    await screen.findByText('This pair agrees.');
    expect(
      screen.getByRole('group', { name: 'Two queried values fold into one' }),
    ).toBeInTheDocument();
    await user.click(screen.getByText('Inspect the committed tables'));
    const original = screen.getByRole('group', { name: 'Original table w' });
    const folded = screen.getByRole('group', { name: 'Folded table g' });
    expect(original.querySelectorAll('.is-open')).toHaveLength(2);
    expect(folded.querySelectorAll('.is-open')).toHaveLength(1);
    expect(within(folded).getByLabelText('Opened at x=1: 10')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Change first folded entry' }));
    expect(screen.getByText('The fold relation fails.')).toBeInTheDocument();
    expect(within(folded).getByLabelText('Opened at x=1: 11')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'FRI query pair' }), '1');
    expect(screen.getByText('This pair agrees.')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'FRI challenge' }), '5');
    expect(within(folded).getByLabelText('Opened at x=4: 0')).toBeInTheDocument();
    expect(container.querySelector('.katex-error')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Explore the definition/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Read the notes' });
    expect(within(dialog).getByRole('link', { name: /Download full note/ })).toHaveAttribute(
      'download',
      'codes_to_proofs.md',
    );
  });
  it('offers an explicit preset when the shared field cannot support an FFT extension', async () => {
    const user = userEvent.setup();
    start({ ...defaultExperiment(5), coefficients: [3, 2, 1, 0, 0] });
    await user.click(await screen.findByRole('button', { name: 'Load the F₁₇ FFT example' }));
    expect(await screen.findByRole('spinbutton', { name: 'Trace values, position 1' })).toHaveValue(
      6,
    );
    expect(screen.getByRole('combobox', { name: 'Load field preset' })).toHaveValue('17');
  });
});
