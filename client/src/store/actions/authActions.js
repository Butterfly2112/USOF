import api, { setAuthToken } from '../../api';

export function login(loginOrEmail, password) {
  return async dispatch => {
    const res = await api.post('/auth/login', { loginOrEmail, password });
    const { token, user } = res.data;
    setAuthToken(token);
    localStorage.setItem('usof_token', token);
    localStorage.setItem('usof_user', JSON.stringify(user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
  };
}

export function hydrateAuth() {
  return dispatch => {
    const token = localStorage.getItem('usof_token');
    const user = localStorage.getItem('usof_user');
    if (token && user) {
      setAuthToken(token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user: JSON.parse(user) } });
    }
  };
}

export function logout() {
  return dispatch => {
    setAuthToken(null);
    localStorage.removeItem('usof_token');
    localStorage.removeItem('usof_user');
    dispatch({ type: 'LOGOUT' });
  };
}
// Deduplicated - keep previous implementations above which persist token + user
