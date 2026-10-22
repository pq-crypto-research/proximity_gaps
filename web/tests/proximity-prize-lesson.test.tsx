import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import App from '../src/App';
import { ExperimentProvider } from '../src/state/ExperimentContext';
import { defaultExperiment, experimentUrl } from '../src/state/model';

function start() {
  window.history.replaceState(null, '', experimentUrl('proximity-prize', defaultExperiment()));
  return render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
}
it('adjusts delta, compares the true maximum, loads a worst pair, and preserves links', async () => {
  const user = userEvent.setup();
  const { container, unmount } = start();
  const delta = await screen.findByRole('slider', { name: 'Delta' });
  expect(delta).toHaveValue('1');
  expect(screen.getByTestId('prize-pair-count')).toHaveTextContent('2/5');
  expect(screen.getByTestId('prize-worst-count')).toHaveTextContent('2/5');
  expect(screen.getByRole('status', { name: 'Prize target' })).toHaveTextContent('Target met');
  expect(screen.getByRole('status', { name: 'Prize MCA result' })).toHaveTextContent('MCA error');
  expect(
    within(screen.getByRole('group', { name: 'All 5 alpha values' })).getAllByRole('button'),
  ).toHaveLength(5);
  await user.click(screen.getByRole('button', { name: 'Delta 2/4, worst-case error 5/5' }));
  expect(delta).toHaveValue('2');
  expect(screen.getByTestId('prize-pair-count')).toHaveTextContent('5/5');
  expect(screen.getByTestId('prize-worst-count')).toHaveTextContent('5/5');
  expect(screen.getByRole('status', { name: 'Prize target' })).toHaveTextContent('Target exceeded');
  expect(screen.getByRole('checkbox', { name: 'Follow worst pair' })).toBeChecked();
  expect(screen.getByTestId('prize-pair-count')).toHaveTextContent('5/5');
  await user.click(screen.getByRole('checkbox', { name: 'Only show S' }));
  const h = screen.getByLabelText('Combination h', { selector: 'tr' });
  expect(h.querySelectorAll('[data-in-support="false"]')).toHaveLength(0);
  fireEvent.change(delta, { target: { value: '0' } });
  expect(screen.getByRole('status', { name: 'Prize MCA result' })).toHaveTextContent('MCA error');
  expect(screen.getByTestId('prize-worst-count')).toHaveTextContent('1/5');
  expect(screen.getByTestId('prize-pair-count')).toHaveTextContent('1/5');
  expect(screen.getByText('4 of 4 points · need at least 4')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reset example' }));
  // Alpha editing must wrap in the new field, not the other lesson's F17.
  const alpha = screen.getByRole('spinbutton', { name: 'Prize alpha, position 1' });
  fireEvent.change(alpha, { target: { value: '7' } });
  fireEvent.blur(alpha);
  expect(alpha).toHaveValue(2);
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Prize f, position 2, x = 2' }), {
    target: { value: '9' },
  });
  expect(JSON.parse(new URLSearchParams(window.location.search).get('s')!).prize).toMatchObject({
    f: [0, 4, 0, 0],
    alpha: 2,
    radius: 1,
    followWorst: false,
  });
  expect(screen.getByRole('checkbox', { name: 'Follow worst pair' })).not.toBeChecked();
  expect(container.querySelector('.katex-error')).toBeNull();
  unmount();
  render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
  expect(await screen.findByRole('spinbutton', { name: 'Prize f, position 2, x = 2' })).toHaveValue(
    4,
  );
});

it('distinguishes a custom pair from the worst case without changing its vectors', async () => {
  const user = userEvent.setup();
  start();
  await user.click(await screen.findByRole('checkbox', { name: 'Follow worst pair' }));
  await user.click(screen.getByRole('button', { name: 'Delta 2/4, worst-case error 5/5' }));
  expect(screen.getByTestId('prize-pair-count')).toHaveTextContent('3/5');
  expect(screen.getByTestId('prize-worst-count')).toHaveTextContent('5/5');
  expect(screen.getByRole('button', { name: 'Delta 2/4, worst-case error 5/5' })).toHaveTextContent(
    'This pair: 3/5',
  );
  const custom = JSON.parse(new URLSearchParams(window.location.search).get('s')!).prize;
  expect(custom.f).toEqual([0, 1, 0, 0]);
  await user.click(screen.getByRole('checkbox', { name: 'Follow worst pair' }));
  expect(screen.getByTestId('prize-pair-count')).toHaveTextContent('5/5');
});
