const initialState = { list: [] };
export default function favoritesReducer(state = initialState, action){
  switch(action.type){
    case 'SET_FAVORITES': return { ...state, list: action.payload.favorites };
    default: return state;
  }
}
