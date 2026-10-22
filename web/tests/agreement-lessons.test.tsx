import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import App from '../src/App';
import { ExperimentProvider } from '../src/state/ExperimentContext';
import { defaultExperiment, experimentUrl, type LessonId } from '../src/state/model';

function start(id: LessonId) {
  window.history.replaceState(null, '', experimentUrl(id, defaultExperiment()));
  return render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
}

it('connects message edits to the matrix and compares shared versus separate column errors', async () => {
  const user = userEvent.setup();
  const { container } = start('interleaved-rs');
  const coefficient = await screen.findByRole('spinbutton', {
    name: 'Message row 2, coefficient 0',
  });
  fireEvent.change(coefficient, { target: { value: '4' } });
  expect(
    screen.getByRole('button', { name: 'Inspect row 2, column 1, value 4' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Compare errors' }));
  await user.click(screen.getByRole('button', { name: 'Same column' }));
  expect(screen.getByTestId('entry-errors')).toHaveTextContent('3');
  expect(screen.getByTestId('column-errors')).toHaveTextContent('1');
  await user.click(screen.getByRole('button', { name: 'Different columns' }));
  expect(screen.getByTestId('entry-errors')).toHaveTextContent('3');
  expect(screen.getByTestId('column-errors')).toHaveTextContent('3');
  await user.click(screen.getByRole('button', { name: 'Add message row' }));
  expect(
    screen.getByRole('spinbutton', { name: 'Message row 4, coefficient 0' }),
  ).toBeInTheDocument();
  expect(container.querySelector('.katex-error')).toBeNull();
});

it('compares all three pairs on S and updates the two failing challenges', async () => {
  const user = userEvent.setup();
  const { container, unmount } = start('mutual-correlated-agreement');
  const alpha = await screen.findByRole('slider', { name: 'Alpha' });
  const verdict = screen.getByRole('status', { name: 'MCA result' });
  expect(alpha).toHaveValue('2');
  expect(verdict).toHaveTextContent('MCA agreement');
  expect(screen.getByRole('spinbutton', { name: 'MCA f, position 7, x = 13' })).toHaveValue(7);
  await user.click(screen.getByRole('button', { name: 'Alpha 10: MCA error' }));
  expect(verdict).toHaveTextContent('MCA error');
  expect(verdict).toHaveTextContent('x = 13');
  expect(container.querySelector('.katex-error')).toBeNull();
  expect(screen.getByTestId('mca-bad-count')).toHaveTextContent('2/17');
  const f = screen.getByLabelText('Vector f', { selector: 'tr' });
  expect(f.querySelector('[data-coordinate="13"]')).toHaveClass('mca-in-mismatch');
  expect(f.querySelector('[data-coordinate="9"]')).toHaveClass('mca-out');
  const h = screen.getByLabelText('Combination h', { selector: 'tr' });
  expect(h.querySelectorAll('.mca-in-match')).toHaveLength(7);
  expect([...h.querySelectorAll('.mca-cell')].map((cell) => Number(cell.textContent))).toEqual([
    0, 0, 0, 0, 0, 0, 0, 7,
  ]);
  await user.click(screen.getByRole('button', { name: 'Alpha 1: MCA agreement' }));
  expect(verdict).toHaveTextContent('MCA agreement');
  expect(f.querySelectorAll('.mca-in-mismatch')).toHaveLength(0);
  expect(h.querySelectorAll('.mca-in-match')).toHaveLength(6);
  await user.click(screen.getByRole('button', { name: 'Alpha 3: MCA error' }));
  expect(verdict).toHaveTextContent('x = 9');
  expect(container.querySelector('.katex-error')).toBeNull();
  expect(f.querySelector('[data-coordinate="9"]')).toHaveClass('mca-in-mismatch');
  expect(f.querySelector('[data-coordinate="13"]')).toHaveClass('mca-out');
  await user.click(screen.getByRole('checkbox', { name: 'Only show S' }));
  expect(h.querySelectorAll('.mca-cell')).toHaveLength(7);
  expect(h.querySelector('[data-coordinate="13"]')).toBeNull();
  expect(
    screen.queryByRole('spinbutton', { name: 'MCA f, position 7, x = 13' }),
  ).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Reset example' }));
  expect(screen.getByRole('checkbox', { name: 'Only show S' })).not.toBeChecked();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'MCA f, position 7, x = 13' }), {
    target: { value: '0' },
  });
  expect(verdict).toHaveTextContent('MCA agreement');
  expect(h.querySelectorAll('.mca-in-match')).toHaveLength(6);
  const saved = JSON.parse(new URLSearchParams(window.location.search).get('s')!);
  expect(saved.mca).toMatchObject({ f: [0, 0, 0, 0, 0, 0, 0, 14], alpha: 2 });
  expect(container.querySelector('.katex-error')).toBeNull();
  unmount();
  render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
  expect(await screen.findByRole('spinbutton', { name: 'MCA f, position 7, x = 13' })).toHaveValue(
    0,
  );
  await user.click(screen.getByRole('button', { name: 'Both codewords' }));
  expect(screen.getByTestId('mca-bad-count')).toHaveTextContent('0/17');
  expect(screen.getByRole('status', { name: 'MCA result' })).toHaveTextContent('MCA agreement');
  fireEvent.change(screen.getByRole('slider', { name: 'Alpha' }), { target: { value: '16' } });
  expect(screen.getByRole('status', { name: 'MCA result' })).toHaveTextContent('MCA agreement');
});

it('does not call insufficient agreement an MCA error', async () => {
  const e = {
    ...defaultExperiment(),
    mca: { f: [1, 4, 16, 13, 1, 4, 16, 13], g: Array(8).fill(0), alpha: 2 },
  };
  window.history.replaceState(null, '', experimentUrl('mutual-correlated-agreement', e));
  render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
  const verdict = await screen.findByRole('status', { name: 'MCA result' });
  expect(verdict).toHaveTextContent('No qualifying agreement');
  expect(verdict).toHaveTextContent('only 2 points');
  expect(screen.getByTestId('mca-bad-count')).toHaveTextContent('0/17');
  expect(
    within(screen.getByRole('group', { name: 'All 17 alpha values' })).getAllByRole('button', {
      name: /no qualifying agreement/,
    }),
  ).toHaveLength(17);
});
