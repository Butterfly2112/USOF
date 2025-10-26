import api from '../../api';

export function addFavorite(postId){
  return async dispatch =>{
    const res = await api.post(`/favorites/${postId}`);
    return res.data;
  };
}

export function removeFavorite(postId){
  return async dispatch =>{
    const res = await api.delete(`/favorites/${postId}`);
    return res.data;
  };
}

export function fetchFavorites(){
  return async dispatch =>{
    const res = await api.get('/favorites');
    dispatch({ type: 'SET_FAVORITES', payload: { favorites: res.data.favorites } });
  };
}
