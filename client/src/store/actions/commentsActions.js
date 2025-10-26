import api from '../../api';

export function fetchComments(postId){
  return async dispatch =>{
    const res = await api.get(`/posts/${postId}/comments`);
    dispatch({ type: 'SET_COMMENTS', payload: { postId, comments: res.data.comments } });
  };
}

export function addComment(postId, content){
  return async dispatch =>{
    const res = await api.post(`/posts/${postId}/comments`, { content });
    return res.data;
  };
}
