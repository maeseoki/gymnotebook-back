import { render } from '@testing-library/react-native';
import HomeScreen from '../app/(authenticated)/(tabs)';
import LoginScreen from '../app/(public)/login';

describe('route skeleton', () => {
  it('renders representative public and authenticated route placeholders', async () => {
    const publicView = await render(<LoginScreen />);
    expect(publicView.getByText('Login foundation placeholder.')).toBeTruthy();

    const authenticatedView = await render(<HomeScreen />);
    expect(authenticatedView.getByText('Home foundation placeholder.')).toBeTruthy();
  });
});
