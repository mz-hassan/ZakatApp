import { useState, useEffect } from 'react';
import { seedDatabase } from './db/db';
import PinLock from './components/PinLock';
import HomeScreen from './screens/HomeScreen';
import YearViewScreen from './screens/YearViewScreen';
import ProfileScreen from './screens/ProfileScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import RecipientsScreen from './screens/RecipientsScreen';
import SettingsScreen from './screens/SettingsScreen';


export default function App() {
    const [unlocked, setUnlocked] = useState(false);
    const [ready, setReady] = useState(false);
    const [screen, setScreen] = useState('home');
    const [params, setParams] = useState({});
    const [history, setHistory] = useState([]);

    useEffect(() => {
        seedDatabase().then(() => setReady(true));
    }, []);

    function navigate(screenName, screenParams = {}) {
        setHistory(prev => [...prev, { screen, params }]);
        setScreen(screenName);
        setParams(screenParams);
    }

    function goBack() {
        if (history.length > 0) {
            const prev = history[history.length - 1];
            setHistory(h => h.slice(0, -1));
            setScreen(prev.screen);
            setParams(prev.params);
        } else {
            setScreen('home');
            setParams({});
        }
    }

    if (!ready) {
        return (
            <div style={{
                minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0c0c0c', color: '#999',
            }}>
                <div>Loading...</div>
            </div>
        );
    }

    if (!unlocked) {
        return <PinLock onUnlock={() => setUnlocked(true)} />;
    }

    switch (screen) {
        case 'home':
            return <HomeScreen onNavigate={navigate} />;
        case 'year':
            return <YearViewScreen yearId={params.yearId} onNavigate={navigate} onBack={goBack} />;
        case 'profile':
            return <ProfileScreen yearId={params.yearId} profileId={params.profileId} onNavigate={navigate} onBack={goBack} />;
        case 'payments':
            return <PaymentsScreen yearId={params.yearId} profileId={params.profileId} onBack={goBack} />;
        case 'recipients':
            return <RecipientsScreen onBack={goBack} />;
        case 'settings':
            return <SettingsScreen onBack={goBack} />;

        default:
            return <HomeScreen onNavigate={navigate} />;
    }
}
