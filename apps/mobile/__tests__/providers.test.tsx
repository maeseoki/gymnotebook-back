import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppProviders } from '@/shared/providers';

describe('AppProviders', () => {
  it('renders children after font bootstrap resolves', async () => {
    const view = await render(
      <AppProviders>
        <Text>Ready</Text>
      </AppProviders>,
    );

    expect(view.getByText('Ready')).toBeTruthy();
  });
});
