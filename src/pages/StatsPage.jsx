import React from 'react';
import { useNavigate } from 'react-router-dom';
import Stats from '../components/Stats';

const StatsPage = () => {
    const navigate = useNavigate();
    return <Stats onBack={() => navigate('/')} />;
};

export default StatsPage;