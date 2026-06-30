import React from 'react';
import AuthForm from '../components/AuthForm';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onSuccess }) => (
  <AuthForm mode="register" onNavigate={onNavigate} onSuccess={onSuccess} />
);

export default RegisterPage;
