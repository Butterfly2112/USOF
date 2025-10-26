import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import thunk from 'redux-thunk';
import authReducer from './reducers/auth';
import postsReducer from './reducers/posts';
import favoritesReducer from './reducers/favorites';

const rootReducer = combineReducers({ auth: authReducer, posts: postsReducer, favorites: favoritesReducer });
const composeEnhancers = (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;
const store = createStore(rootReducer, composeEnhancers(applyMiddleware(thunk)));
export default store;
