import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function HomePage() {
  // Check for auth token in cookies or redirect to login
  // For now, redirect to dashboard - the dashboard will handle auth checking
  redirect('/dashboard');
}
