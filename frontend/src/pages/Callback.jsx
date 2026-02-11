import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Keycloak will handle the redirect
    setTimeout(() => {
      navigate('/');
    }, 1000);
  }, [navigate]);

  return <Loading />;
};

export default Callback;
