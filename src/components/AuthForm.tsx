import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAlert } from '../components/AlertProvider';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface AuthFormProps {
  mode: 'login' | 'register';
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode, onNavigate, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useAuthStore();
  const { showSuccess, showError } = useAlert();

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegister && password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        showSuccess(isRegister ? 'Account created successfully!' : 'Logged in successfully!');
        if (onSuccess) onSuccess();
        onNavigate('applications');
      } else {
        showError(data.error || (isRegister ? 'Registration failed' : 'Login failed'));
      }
    } catch {
      showError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-background dark:bg-muted px-4 py-12 sm:px-6 lg:px-8'>
      <Card className='max-w-md w-full p-6 sm:p-10'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex justify-center'>
            <img src='/jajat-logo.png' alt='JAJAT Logo' className='h-12 w-auto' />
          </div>
          <div className='flex items-center gap-3 mt-6 mb-4'>
            <div className='w-8 h-0.5 bg-primary/80'></div>
            <span className='text-primary text-sm font-medium tracking-wider uppercase'>
              {isRegister ? 'Get Started' : 'Welcome Back'}
            </span>
          </div>
          <h1 className='font-serif text-3xl font-semibold text-foreground'>
            {isRegister ? 'Create your account' : 'Sign in to your account'}
          </h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  type='button'
                  onClick={() => onNavigate('login')}
                  className='font-medium text-primary hover:text-primary dark:text-primary dark:hover:text-primary focus:outline-none focus:underline'
                >
                  Sign in instead
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type='button'
                  onClick={() => onNavigate('register')}
                  className='font-medium text-primary hover:text-primary dark:text-primary dark:hover:text-primary focus:outline-none focus:underline'
                >
                  Create a new account
                </button>
              </>
            )}
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
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              maxLength={100}
            />
            {isRegister && (
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
            )}
          </div>

          <Button
            type='submit'
            disabled={isSubmitting}
            variant='primary'
            size='lg'
            className='w-full'
          >
            {isSubmitting
              ? (isRegister ? 'Creating account...' : 'Signing in...')
              : (isRegister ? 'Create account' : 'Sign in')}
          </Button>
        </form>

        {!isRegister && (
          <>
            {/* Divider */}
            <div className='relative mt-8'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-border'></div>
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-3 bg-card text-muted-foreground'>Or continue with</span>
              </div>
            </div>

            {/* Google Button */}
            <div className='mt-6'>
              <button
                type='button'
                className='w-full inline-flex justify-center py-2.5 px-4 border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors'
              >
                <span className='sr-only'>Sign in with Google</span>
                <svg className='size-5' aria-hidden='true' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M12.48 10.92v3.28h4.78c-.19 1.06-.92 1.96-1.91 2.59l2.72 2.11c1.59-1.47 2.49-3.62 2.49-6.09 0-.47-.04-.92-.12-1.36l-8.48-.53-.51 2.01z' />
                  <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-2.72-2.11c-.75.5-1.71.81-2.77.81-2.13 0-3.93-1.44-4.58-3.39l-2.82 2.18C8.1 20.37 10.15 23 12 23z' />
                  <path d='M7.42 15.65c-.17-.5-.26-1.04-.26-1.65s.09-1.15.26-1.65l-2.82-2.18C4.1 11.1 3.5 12.5 3.5 14s.6 2.9 1.1 3.83l2.82-2.18z' />
                  <path d='M12 5c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 1.54 14.96 1 12 1 10.15 1 8.1 3.63 6.6 6.17l2.82 2.18c.65-1.95 2.45-3.35 4.58-3.35z' />
                </svg>
                <span className='ml-2'>Google</span>
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AuthForm;
