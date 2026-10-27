import { Redirect } from 'expo-router';
import { useApp } from '@/context/App';

export default function Entrada() {
  const { cuenta } = useApp();
  return <Redirect href={cuenta ? '/(tabs)' : '/login'} />;
}
