import React from 'react';
import AuthForm from '../components/AuthForm';

interface LoginPageProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onSuccess }) => (
  <AuthForm mode="login" onNavigate={onNavigate} onSuccess={onSuccess} />
);

export default LoginPage;
