import { useState, useEffect } from 'react';
import { db, seedDatabase } from './db/db';
import PinLock from './components/PinLock';
import HomeScreen from './screens/HomeScreen';
import YearViewScreen from './screens/YearViewScreen';
import ProfileScreen from './screens/ProfileScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import RecipientsScreen from './screens/RecipientsScreen';
import SettingsScreen from './screens/SettingsScreen';
import AboutScreen from './screens/AboutScreen';

export default function App() {
    const [unlocked, setUnlocked] = useState(false);
    const [ready, setReady] = useState(false);
    const [screen, setScreen] = useState('home');
    const [params, setParams] = useState({});
    const [history, setHistory] = useState([]);

    useEffect(() => {
        seedDatabase().then(async () => {
            // Apply saved theme before first render
            const themeSetting = await db.settings.get('theme');
            if (themeSetting?.value === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            }
            setReady(true);
        });
    }, []);

    useEffect(() => {
        async function requestPersistentStorage() {
            if (!navigator.storage?.persisted || !navigator.storage?.persist) return;

            try {
                const alreadyPersistent = await navigator.storage.persisted();
                if (!alreadyPersistent) {
                    await navigator.storage.persist();
                }
            } catch {
                // Ignore browsers that reject or do not support persistence.
            }
        }

        requestPersistentStorage();
    }, []);

    useEffect(() => {
        if (!ready || !unlocked) return;

        function handlePopState(event) {
            const state = event.state;
            if (state?.__zakatManager) {
                setScreen(state.screen || 'home');
                setParams(state.params || {});
                setHistory(state.history || []);
                return;
            }

            setScreen('home');
            setParams({});
            setHistory([]);
        }

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [ready, unlocked]);

    useEffect(() => {
        if (!ready || !unlocked) return;

        window.history.replaceState({
            __zakatManager: true,
            screen,
            params,
            history,
        }, '');
    }, [history, params, ready, screen, unlocked]);

    function navigate(screenName, screenParams = {}) {
        const nextHistory = [...history, { screen, params }];
        setHistory(nextHistory);
        setScreen(screenName);
        setParams(screenParams);
        window.history.pushState({
            __zakatManager: true,
            screen: screenName,
            params: screenParams,
            history: nextHistory,
        }, '');
    }

    function goBack() {
        if (history.length > 0) {
            window.history.back();
        } else {
            setScreen('home');
            setParams({});
        }
    }

    if (!ready) {
        return (
            <div style={{
                minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg, #0c0c0c)', color: 'var(--text-muted, #666)',
            }}>
                <div>Loading…</div>
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
            return <SettingsScreen onBack={goBack} onNavigate={navigate} />;
        case 'about':
            return <AboutScreen onBack={goBack} />;
        case 'pin-setup':
            return <PinLock mode="setup" onBack={goBack} onComplete={goBack} />;
        default:
            return <HomeScreen onNavigate={navigate} />;
    }
}
