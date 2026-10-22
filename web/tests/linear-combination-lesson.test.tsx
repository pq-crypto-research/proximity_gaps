import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import App from '../src/App';
import { ExperimentProvider } from '../src/state/ExperimentContext';
import { defaultExperiment, experimentUrl } from '../src/state/model';

it('connects editable tapes, alpha, codeword presets, reset, and saved links', async () => {
  const user = userEvent.setup();
  window.history.replaceState(
    null,
    '',
    experimentUrl('random-linear-combination', defaultExperiment()),
  );
  const { container, unmount } = render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
  const alpha = await screen.findByRole('slider', { name: 'Alpha' });
  const result = within(screen.getByRole('region', { name: 'Result h' }));
  const delta = result.getByRole('status', { name: 'Distance to nearest codeword' });
  expect(delta).toHaveTextContent('0 of 8 entries differ.');
  expect(result.getByText('Valid codeword')).toBeInTheDocument();
  expect(
    result.getByRole('button', { name: 'Result h, position 5, value 16' }),
  ).toBeInTheDocument();
  expect(screen.getByText('1/17')).toBeInTheDocument();

  fireEvent.change(alpha, { target: { value: '2' } });
  expect(delta).toHaveTextContent('1 of 8 entries differs.');
  expect(delta).toHaveTextContent('12.5%');
  expect(result.getByText('Word · not a codeword')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Result h' })).not.toHaveClass('rlc-codeword');
  expect(
    result.getByRole('button', { name: 'Result h, position 5, value 11' }),
  ).toBeInTheDocument();

  const fCell = screen.getByRole('spinbutton', { name: 'Vector f, position 5' });
  fireEvent.change(fCell, { target: { value: '-11' } });
  fireEvent.blur(fCell);
  expect(fCell).toHaveValue(6);
  expect(delta).toHaveTextContent('0 of 8 entries differ.');
  expect(result.getByText('Valid codeword')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Result h' })).toHaveClass('rlc-codeword');

  await user.click(screen.getByRole('button', { name: 'Set f to a codeword' }));
  await user.click(screen.getByRole('button', { name: 'Set g to a codeword' }));
  expect(screen.getByText('17/17')).toBeInTheDocument();
  fireEvent.change(alpha, { target: { value: '16' } });
  expect(result.getByText('Valid codeword')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Set f to a non-codeword' }));
  expect(screen.getByText('0/17')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Reset example' }));
  expect(alpha).toHaveValue('3');
  expect(fCell).toHaveValue(1);
  expect(screen.getByRole('spinbutton', { name: 'Vector g, position 5' })).toHaveValue(5);
  expect(result.getByText('Valid codeword')).toBeInTheDocument();
  expect(container.querySelector('.katex-error')).toBeNull();
  const navigation = within(screen.getByRole('navigation', { name: 'Experiments' })).getAllByRole(
    'link',
  );
  expect(navigation[7]).toHaveAccessibleName('08 Random Linear Combination');
  expect(navigation[8]).toHaveAccessibleName('09 MCA');

  fireEvent.change(screen.getByRole('spinbutton', { name: 'Vector g, position 1' }), {
    target: { value: '7' },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Alpha, position 1' }), {
    target: { value: '8' },
  });
  unmount();
  render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
  expect(await screen.findByRole('spinbutton', { name: 'Vector g, position 1' })).toHaveValue(7);
  expect(screen.getByRole('slider', { name: 'Alpha' })).toHaveValue('8');
  expect(screen.getByRole('button', { name: 'Result h, position 1, value 6' })).toBeInTheDocument();
  expect(screen.getByRole('status', { name: 'Distance to nearest codeword' })).toHaveTextContent(
    '25%',
  );
});
