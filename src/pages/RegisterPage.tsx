import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAlert } from '../components/AlertProvider';
import { Input, Button, Card } from '../components/ui';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useAuthStore();
  const { showSuccess, showError } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        showSuccess('Account created successfully!');
        if (onSuccess) onSuccess();
        onNavigate('applications');
      } else {
        showError(data.error || 'Registration failed');
      }
    } catch {
      showError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-earth-50 dark:bg-earth-900 px-4 py-12 sm:px-6 lg:px-8'>
      <Card className='max-w-md w-full p-6 sm:p-10'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex justify-center'>
             <img src='/jajat-logo.png' alt='JAJAT Logo' className='h-12 w-auto' />
          </div>
          <div className='flex items-center gap-3 mt-6 mb-4'>
            <div className='w-8 h-0.5 bg-sage-500'></div>
            <span className='text-sage-600 dark:text-sage-400 text-sm font-medium tracking-wider uppercase'>
              Get Started
            </span>
          </div>
          <h1 className='font-serif text-3xl font-semibold text-earth-900 dark:text-earth-50'>
            Create your account
          </h1>
          <p className='mt-2 text-sm text-earth-600 dark:text-earth-400'>
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className='font-medium text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300 focus:outline-none focus:underline'
            >
              Sign in instead
            </button>
          </p>
        </div>

        {/* Form */}
        <form className='space-y-5' onSubmit={handleSubmit}>
          <div className='space-y-4'>
            <Input
              id='email-address'
              name='email'
              type='email'
              autoComplete='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='you@example.com'
              maxLength={254}
            />
            <Input
              id='password'
              name='password'
              type='password'
              autoComplete='new-password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              maxLength={100}
            />
            <Input
              id='confirm-password'
              name='confirm-password'
              type='password'
              autoComplete='new-password'
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='••••••••'
              maxLength={100}
            />
          </div>

          <Button
            type='submit'
            disabled={isSubmitting}
            variant='primary'
            size='lg'
            className='w-full'
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default RegisterPage;