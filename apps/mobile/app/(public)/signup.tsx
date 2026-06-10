import { Link } from 'expo-router';
import { KeyboardSafeScreen, Text } from '@/shared/ui/primitives';

export default function SignupScreen() {
  return (
    <KeyboardSafeScreen>
      <Text>Signup foundation placeholder.</Text>
      <Link href="/(public)/login">Back to login</Link>
    </KeyboardSafeScreen>
  );
}
