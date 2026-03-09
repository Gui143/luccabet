import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const Invite: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      // Store referral code in localStorage
      localStorage.setItem('referral_code', code);
    }
    // Redirect to auth page
    navigate('/auth', { replace: true });
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Redirecionando...</p>
    </div>
  );
};

export default Invite;
