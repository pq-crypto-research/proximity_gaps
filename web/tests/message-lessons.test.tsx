import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { ExperimentProvider } from '../src/state/ExperimentContext';

const state = () => JSON.parse(new URLSearchParams(window.location.search).get('s')!);
function start(path = '/') {
  window.history.replaceState(null, '', path);
  return render(
    <ExperimentProvider>
      <App />
    </ExperimentProvider>,
  );
}

describe('the opening message flow', () => {
  it('types letters across message cells, pastes from the selected position, and keeps numeric input in one cell', async () => {
    const user = userEvent.setup();
    start();
    const first = await screen.findByRole('textbox', { name: 'Message, position 1' });
    await user.click(first);
    await user.keyboard('World');
    expect(state().message.values).toEqual([87, 111, 114, 108, 100]);
    expect(screen.getByRole('textbox', { name: 'Message, position 5' })).toHaveFocus();
    await user.click(first);
    await user.paste('Hello');
    expect(state().message.values).toEqual([72, 101, 108, 108, 111]);
    await user.click(screen.getByRole('textbox', { name: 'Message, position 3' }));
    await user.paste('a1Zextra');
    expect(state().message.values).toEqual([72, 101, 97, 49, 90]);
    await user.click(first);
    await user.keyboard('256');
    expect(first).toHaveFocus();
    expect(first).toHaveValue('256');
    expect(state().message.values[0]).toBe(256);
  });
  it('interpolates live ASCII edits, keeps five slots, and carries the message into encoding and history', async () => {
    const user = userEvent.setup();
    const { container, unmount } = start();
    const input = await screen.findByRole('textbox', { name: 'Message, position 1' });
    expect(
      screen.getByLabelText('Interpolated polynomial: 72 + 239X + 97X^{2} + 68X^{3} + 139X^{4}'),
    ).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'A');
    expect(state().message.values[0]).toBe(65);
    expect(
      screen.queryByLabelText('Interpolated polynomial: 72 + 239X + 97X^{2} + 68X^{3} + 139X^{4}'),
    ).toBeNull();
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('65');
    await user.clear(input);
    await user.keyboard('{Backspace}{Delete}');
    expect(
      within(screen.getByRole('group', { name: 'Message values' })).getAllByRole('textbox'),
    ).toHaveLength(5);
    await user.tab();
    expect(input).toHaveValue('65');
    await user.click(screen.getByRole('link', { name: '02 Message to codeword' }));
    expect(
      await screen.findByRole('button', { name: 'Codeword, position 1, value 65' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Recovered message: 65, 101, 108, 108, 111')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '01 Message interpolation' }));
    expect(await screen.findByRole('textbox', { name: 'Message, position 1' })).toHaveValue('65');
    await act(async () => window.history.back());
    expect(
      await screen.findByRole('button', { name: 'Codeword, position 1, value 65' }),
    ).toBeInTheDocument();
    const saved = window.location.pathname + window.location.search;
    unmount();
    start(saved);
    expect(await screen.findByRole('textbox', { name: 'Message, position 1' })).toHaveValue('65');
    expect(container.querySelector('.katex-error')).toBeNull();
  });
  it('drags the output edge and changes the erasure recovery limit', async () => {
    const user = userEvent.setup();
    const { container } = start('/visuals/evaluation-codeword');
    const handle = await screen.findByRole('slider', { name: 'Evaluation points' });
    // jsdom lacks pointer capture; dispatch pointer-shaped MouseEvents with exact coordinates.
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = () => true;
    handle.releasePointerCapture = vi.fn();
    fireEvent(handle, new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100 }));
    fireEvent(handle, new MouseEvent('pointermove', { bubbles: true, clientX: 268 }));
    fireEvent(handle, new MouseEvent('pointerup', { bubbles: true, clientX: 268 }));
    expect(handle).toHaveAttribute('aria-valuenow', '14');
    expect(
      within(screen.getByRole('group', { name: 'Codeword' })).getAllByRole('button'),
    ).toHaveLength(14);
    expect(
      container.querySelectorAll('.message-codeword-stage .message-output-symbol.is-kept'),
    ).toHaveLength(14);
    const lost = screen.getByRole('slider', { name: 'Lost symbols' });
    fireEvent.change(lost, { target: { value: '9' } });
    expect(container.querySelectorAll('.transmission-symbol.is-missing')).toHaveLength(9);
    expect(screen.getByLabelText('Recovered message: 72, 101, 108, 108, 111')).toBeInTheDocument();
    fireEvent.change(lost, { target: { value: '10' } });
    expect(screen.getByText('Too few surviving evaluations')).toBeInTheDocument();
    expect(screen.queryByLabelText('Recovered message: 72, 101, 108, 108, 111')).toBeNull();
    await user.click(handle);
    await user.keyboard('{Home}{ArrowLeft}');
    expect(handle).toHaveAttribute('aria-valuenow', '5');
    expect(state().message.channel.count).toBe(5);
    expect(container.querySelectorAll('.transmission-symbol.is-missing')).toHaveLength(5);
    await user.keyboard('{End}{ArrowRight}');
    expect(handle).toHaveAttribute('aria-valuenow', '24');
    expect(screen.getByLabelText('Recovered message: 72, 101, 108, 108, 111')).toBeInTheDocument();
    expect(container.querySelector('.katex-error')).toBeNull();
  });
  it('hides unknown error locations, shows the two-unit cost, and does not promise recovery beyond the bound', async () => {
    const user = userEvent.setup();
    const { container } = start('/visuals/evaluation-codeword');
    await user.click(await screen.findByRole('button', { name: 'Wrong values' }));
    expect(screen.getByText('6 / 6 used')).toBeInTheDocument();
    expect(container.querySelectorAll('.transmission-symbol.is-corrupt')).toHaveLength(0);
    expect(screen.getByLabelText('Recovered message: 72, 101, 108, 108, 111')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Reveal changed positions' }));
    expect(container.querySelectorAll('.transmission-symbol.is-corrupt')).toHaveLength(3);
    fireEvent.change(screen.getByRole('slider', { name: 'Corrupted symbols' }), {
      target: { value: '4' },
    });
    expect(screen.getByText('Recovery is no longer guaranteed')).toBeInTheDocument();
    expect(screen.getByText('8 / 6 used')).toBeInTheDocument();
    expect(screen.queryByLabelText('Recovered message: 72, 101, 108, 108, 111')).toBeNull();
    const before = state().message.channel.seed;
    await user.click(screen.getByRole('button', { name: 'Randomize positions' }));
    expect(state().message.channel.seed).not.toBe(before);
    expect(state().message.channel.count).toBe(4);
    const links = within(screen.getByRole('navigation', { name: 'Experiments' })).getAllByRole(
      'link',
    );
    expect(links[3]).toHaveAccessibleName('04 Interleaved RS');
    expect(links[4]).toHaveAccessibleName('05 Measure errors');
    await user.click(screen.getByRole('link', { name: '03 Coefficients to polynomial' }));
    expect(await screen.findByText(/In a typical STARK/)).toHaveTextContent('evaluations');
  });
  it('edits and shares the received vector, decodes combined damage, and restores the transmitted word', async () => {
    const user = userEvent.setup();
    const { unmount } = start('/visuals/evaluation-codeword');
    await user.click(await screen.findByRole('button', { name: 'Restore sent vector' }));
    const edit = async (position: number, text: string) => {
      const input = screen.getByRole('textbox', { name: 'Received, position ' + position });
      await user.click(input);
      await user.keyboard(text);
    };
    await edit(1, '73');
    await edit(2, '102');
    await edit(3, '{Backspace}');
    await edit(4, '{Backspace}');
    expect(screen.getByText('6 / 6 used')).toBeInTheDocument();
    expect(screen.getByLabelText('Recovered message: 72, 101, 108, 108, 111')).toBeInTheDocument();
    const received = [73, 102, null, null, 111, 122, 141, 163, 178, 171, 122];
    expect(state().message.channel.received).toEqual(received);
    const url = window.location.pathname + window.location.search;
    unmount();
    start(url);
    expect(await screen.findByRole('textbox', { name: 'Received, position 1' })).toHaveValue('73');
    expect(screen.getByRole('textbox', { name: 'Received, position 3' })).toHaveValue('');
    await edit(5, '{Backspace}');
    expect(screen.getByText('7 / 6 used')).toBeInTheDocument();
    expect(screen.getByText('Recovery is no longer guaranteed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore sent vector' }));
    expect(screen.getByRole('textbox', { name: 'Received, position 1' })).toHaveValue('72');
    expect(state().message.channel.received).toBeUndefined();
    expect(screen.getByText('0 / 6 used')).toBeInTheDocument();
    await edit(1, '999');
    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Received, position 1' })).toHaveValue('228');
    await user.click(screen.getByRole('button', { name: 'Increase evaluation points' }));
    expect(state().message.channel.received).toBeUndefined();
    expect(
      within(screen.getByRole('group', { name: 'Received word' })).getAllByRole('textbox'),
    ).toHaveLength(12);
  });
});
