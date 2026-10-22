import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import App from '../src/App';
import { ExperimentProvider } from '../src/state/ExperimentContext';
import { defaultExperiment, experimentUrl } from '../src/state/model';

it('keeps explanations on their own page and preserves the experiment through reference navigation', async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, '', experimentUrl('proximity-prize', defaultExperiment()));
  const { container, unmount } = render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
  await screen.findByRole('slider', { name: 'Delta' });
  expect(screen.queryByText('Why “probability”?')).toBeNull();
  expect(screen.queryByText('Why these parameters work')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Further reading' })).toBeNull();
  expect(container.querySelector('.lesson-footer')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Delta 2/4, worst-case error 5/5' }));
  const saved = JSON.parse(new URLSearchParams(window.location.search).get('s')!).prize;
  await user.click(screen.getByRole('link', { name: 'Further reading' }));
  await screen.findByRole('heading', { name: 'Further reading', level: 2 });
  expect(window.location.pathname).toBe('/visuals/further-reading');
  expect(screen.getByRole('link', { name: 'Further reading' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByText('Why these parameters work')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Papers' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /WHIR.*PDF/ })).toBeInTheDocument();
  expect(container.querySelector('.parameter-strip')).toBeNull();
  for (const detail of container.querySelectorAll('details.definition')) {
    await user.click(detail.querySelector('summary')!);
  }
  expect(container.querySelector('.katex-error')).toBeNull();
  unmount();
  render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
  await screen.findByRole('heading', { name: 'Papers' });
  await user.click(screen.getByRole('link', { name: '10 Proximity Prize' }));
  expect(await screen.findByRole('slider', { name: 'Delta' })).toHaveValue('2');
  expect(JSON.parse(new URLSearchParams(window.location.search).get('s')!).prize).toEqual(saved);
});
