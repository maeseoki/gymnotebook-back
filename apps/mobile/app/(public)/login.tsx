import { Link } from 'expo-router';
import { KeyboardSafeScreen, Text } from '@/shared/ui/primitives';

export default function LoginScreen() {
  return (
    <KeyboardSafeScreen>
      <Text>The Gym Notebook</Text>
      <Text>Login foundation placeholder.</Text>
      <Link href="/(public)/signup">Create account</Link>
    </KeyboardSafeScreen>
  );
}
