import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { logIn, register } from '../api/auth';

type Mode = 'login' | 'register';

type Props = {
  open: boolean;
  onLogin: (email: string) => void;
  onClose: () => void;
};

export default function AuthDialog({ open, onLogin, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('login');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const registering = mode === 'register';
  const submitLabel = registering ? 'Создать аккаунт' : 'Войти';

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  function switchMode(next: Mode) {
    setMode(next);
    setPassword('');
    setError('');
    setNotice('');
  }

  function closeDialog() {
    switchMode('login');
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    setNotice('');
    setPending(true);

    try {
      if (registering) {
        const { user } = await register(email, password);
        setEmail(user.email);
        switchMode('login');
        setNotice('Аккаунт создан. Войдите с вашим паролем.');
        return;
      }

      const { user } = await logIn(email, password);
      onLogin(user.email);
      dialog.current?.close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось выполнить запрос.');
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog className="auth-dialog" ref={dialog} aria-labelledby="auth-heading"
      onClose={closeDialog} onCancel={(event) => { if (pending) event.preventDefault(); }}>
      <div className="auth-heading">
        <h2 id="auth-heading">{registering ? 'Регистрация' : 'Вход'}</h2>
        <button className="auth-close" type="button" aria-label="Закрыть" disabled={pending}
          onClick={() => dialog.current?.close()}>×</button>
      </div>
      <form onSubmit={submit}>
        <fieldset className="auth-fields" disabled={pending}>
          <div>
            <label htmlFor="account-email">Email</label>
            <input id="account-email" type="email" autoComplete="username" value={email}
              maxLength={254} required onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label htmlFor="account-password">Пароль</label>
            <input id="account-password" type="password" value={password} required
              autoComplete={registering ? 'new-password' : 'current-password'}
              minLength={8} maxLength={128} onChange={(event) => setPassword(event.target.value)} />
            {registering && <p className="auth-hint">От 8 до 128 символов</p>}
          </div>
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit">{pending ? 'Подождите…' : submitLabel}</button>
        </fieldset>
      </form>
      <button className="auth-switch" type="button" disabled={pending}
        onClick={() => switchMode(registering ? 'login' : 'register')}>
        {registering ? 'У меня уже есть аккаунт' : 'Зарегистрироваться'}
      </button>
    </dialog>
  );
}
