import api from '../../api';

export function fetchPosts(params = {}) {
  return async dispatch => {
    // Clean params: do not send empty-string values (e.g. status='') because
    // server treats an explicit empty status as a filter for status = '' which
    // matches nothing. Only include params that are meaningful.
    const cleanParams = {};
    for (const k of Object.keys(params || {})) {
      const v = params[k];
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      cleanParams[k] = v;
    }
    const res = await api.get('/posts', { params: cleanParams });
    const posts = res.data.posts || [];
    dispatch({ type: 'SET_POSTS', payload: { posts } });
      const total = Number(res.data.total || posts.length);
      dispatch({ type: 'SET_PAGING', payload: { page: Number(params.page || 1), pageSize: Number(params.pageSize || 10), total } });
  };
}
