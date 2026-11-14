import { useEffect, useState } from 'react';
import { getSession, logOut } from '../api/auth';
import AuthDialog from './AuthDialog';
import './AccountMenu.css';

type SessionState =
  | { status: 'checking' }
  | { status: 'unavailable' }
  | { status: 'guest' }
  | { status: 'signed-in'; email: string };

export default function AccountMenu() {
  const [session, setSession] = useState<SessionState>({ status: 'checking' });
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [logoutNotice, setLogoutNotice] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function checkSession() {
      try {
        const { user } = await getSession(controller.signal);
        if (controller.signal.aborted) return;

        if (user) {
          setSession({ status: 'signed-in', email: user.email });
        } else {
          setSession({ status: 'guest' });
        }
      } catch {
        if (!controller.signal.aborted) setSession({ status: 'unavailable' });
      }
    }

    checkSession();
    return () => controller.abort();
  }, [sessionAttempt]);

  useEffect(() => {
    if (!logoutNotice) return;
    const timer = window.setTimeout(() => setLogoutNotice(false), 5000);
    return () => window.clearTimeout(timer);
  }, [logoutNotice]);

  function retrySession() {
    setSession({ status: 'checking' });
    setSessionAttempt((attempt) => attempt + 1);
  }

  function openDialog() {
    setLogoutNotice(false);
    setDialogOpen(true);
  }

  function finishLogin(email: string) {
    setSession({ status: 'signed-in', email });
  }

  async function leave() {
    setLeaving(true);
    setLogoutError('');

    try {
      await logOut();
      setSession({ status: 'guest' });
      setLogoutNotice(true);
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Не удалось выйти.');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="account-menu">
      {session.status === 'signed-in' && (
        <>
          <span className="account-email" title={session.email}>{session.email}</span>
          <button className="account-action" type="button" onClick={leave} disabled={leaving}>Выйти</button>
        </>
      )}
      {session.status === 'guest' && (
        <button className="account-action" type="button" onClick={openDialog}>Войти</button>
      )}
      {session.status === 'checking' && (
        <span className="account-status" role="status">Проверяем вход…</span>
      )}
      {session.status === 'unavailable' && (
        <>
          <span className="account-status" role="status">Не удалось проверить вход</span>
          <button className="account-action" type="button" onClick={retrySession}>Повторить</button>
        </>
      )}
      {logoutError && <p className="account-error error" role="alert">{logoutError}</p>}
      <div className="logout-notice" role="status">
        {logoutNotice && <p>Вы вышли из аккаунта.</p>}
      </div>
      <AuthDialog open={dialogOpen} onLogin={finishLogin} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
